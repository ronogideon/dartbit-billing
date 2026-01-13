const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { RouterOSAPI } = require('node-routeros');

const app = express();
app.use(cors());
app.use(express.json());

// --- PERSISTENT STORAGE SETUP ---
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DB = {
  routers: path.join(DATA_DIR, 'routers.json'),
  clients: path.join(DATA_DIR, 'clients.json'),
  plans: path.join(DATA_DIR, 'plans.json'),
  payments: path.join(DATA_DIR, 'payments.json'),
  discovery: path.join(DATA_DIR, 'discovered.json')
};

const readJson = (file) => {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { return []; }
};

const writeJson = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// State for real-time speed calculation
const throughputCache = {};

// --- MIKROTIK HARDWARE INTERFACE ---

async function getRouterConn(router) {
  return new RouterOSAPI({
    host: router.host,
    user: router.username || 'admin',
    password: router.password || '',
    port: parseInt(router.port) || 8728,
    timeout: 5
  });
}

async function getRouterStats(router) {
  const api = await getRouterConn(router);
  try {
    await api.connect();
    const resources = await api.write('/system/resource/print');
    const ppp = await api.write('/ppp/active/print');
    const hs = await api.write('/ip/hotspot/active/print');
    await api.close();

    const res = resources[0];
    return {
      ...router,
      status: 'ONLINE',
      cpu: parseInt(res['cpu-load']) || 0,
      memory: Math.round(parseInt(res['free-memory']) / (1024 * 1024)),
      totalMemory: Math.round(parseInt(res['total-memory']) / (1024 * 1024)),
      uptime: res['uptime'] || '0s',
      version: res['version'] || 'unknown',
      sessions: ppp.length + hs.length,
      lastSync: new Date().toLocaleString()
    };
  } catch (err) {
    return { ...router, status: 'OFFLINE', cpu: 0, sessions: 0, uptime: 'Down' };
  }
}

// --- API ENDPOINTS ---

app.get('/api/health', (req, res) => res.json({ success: true }));

app.get('/api/routers', async (req, res) => {
  const routers = readJson(DB.routers);
  const updated = await Promise.all(routers.map(getRouterStats));
  writeJson(DB.routers, updated);
  res.json(updated);
});

app.post('/api/routers', (req, res) => {
  writeJson(DB.routers, req.body);
  res.json({ success: true });
});

app.delete('/api/routers/:id', (req, res) => {
  const routers = readJson(DB.routers).filter(r => r.id !== req.params.id);
  writeJson(DB.routers, routers);
  res.json({ success: true });
});

app.get('/api/clients', (req, res) => res.json(readJson(DB.clients)));

app.post('/api/clients', (req, res) => {
  const clients = readJson(DB.clients);
  const idx = clients.findIndex(c => c.id === req.body.id);
  if (idx > -1) clients[idx] = req.body;
  else clients.unshift(req.body);
  writeJson(DB.clients, clients);
  res.json({ success: true });
});

app.get('/api/mikrotik/active-sessions', async (req, res) => {
  const routers = readJson(DB.routers).filter(r => r.status === 'ONLINE');
  const clients = readJson(DB.clients);
  const sessions = [];

  for (const router of routers) {
    const api = await getRouterConn(router);
    try {
      await api.connect();
      const ppp = await api.write('/ppp/active/print');
      const hs = await api.write('/ip/hotspot/active/print');
      await api.close();

      [...ppp, ...hs].forEach(s => {
        const username = s.name || s.user;
        const dbClient = clients.find(c => c.username === username);
        const sessId = `${router.id}-${username}`;
        const bin = parseInt(s['bytes-in']) || 0;
        const bout = parseInt(s['bytes-out']) || 0;

        let dRate = 0, uRate = 0;
        if (throughputCache[sessId]) {
          const delta = (Date.now() - throughputCache[sessId].t) / 1000;
          if (delta > 0) {
            dRate = (bin - throughputCache[sessId].bin) * 8 / delta;
            uRate = (bout - throughputCache[sessId].bout) * 8 / delta;
          }
        }
        throughputCache[sessId] = { t: Date.now(), bin, bout };

        sessions.push({
          id: s['.id'],
          fullName: dbClient ? dbClient.fullName : 'Unknown Device',
          username: username,
          connectionType: s.service === 'pppoe' ? 'PPPoE' : 'Hotspot',
          uptime: s.uptime,
          downloadBytes: bin,
          uploadBytes: bout,
          downloadRate: Math.max(0, dRate),
          uploadRate: Math.max(0, uRate),
          connectedNode: router.name,
          address: s.address || s['caller-id']
        });
      });
    } catch (e) {}
  }
  res.json(sessions);
});

app.get('/api/plans', (req, res) => res.json(readJson(DB.plans)));
app.post('/api/plans', (req, res) => {
  const plans = readJson(DB.plans);
  const idx = plans.findIndex(p => p.id === req.body.id);
  if (idx > -1) plans[idx] = req.body;
  else plans.unshift(req.body);
  writeJson(DB.plans, plans);
  res.json({ success: true });
});

app.post('/api/discovery/clear', (req, res) => {
  writeJson(DB.discovery, []);
  res.json({ success: true });
});

app.get('/api/discovered', (req, res) => res.json(readJson(DB.discovery)));

// --- ONE-STEP PROVISIONING ENDPOINT ---
app.get('/boot', (req, res) => {
  const ip = req.query.ip || req.ip;
  const discovered = readJson(DB.discovery);
  discovered.push({ id: `d-${Date.now()}`, host: ip, name: 'Awaiting Hub Name', seen: new Date().toISOString() });
  writeJson(DB.discovery, discovered);
  
  // Set the RSC content type
  res.set('Content-Type', 'text/plain');

  // Comprehensive Provisioning Script
  const rsc = `
#-------------------------------------------------------------------------------
# dartbit Unified Provisioning Script v2.5
#-------------------------------------------------------------------------------
/log info "--- [DARTBIT] Starting One-Step Deployment ---"

# 1. System Identity & Time
/system identity set name="dartbit-Node"
/system clock set time-zone-name=Africa/Nairobi
/log info "Identity and Timezone set to Nairobi."

# 2. API & Management
/ip service enable api
/ip service set api port=8728
/log info "Management API enabled on port 8728."

# 3. Dedicated IP Pool for Subscribers
/ip pool add name=dartbit-pool ranges=10.10.0.10-10.10.255.254
/log info "Subcriber IP Pool created (10.10.0.0/16)."

# 4. PPPoE Service Configuration
/ppp profile add name=dartbit-pppoe local-address=10.10.0.1 remote-address=dartbit-pool dns-server=8.8.8.8,1.1.1.1
/log info "PPPoE Profiles ready."

# 5. Hotspot Service Configuration
/ip hotspot profile add name=hsprof-dartbit hotspot-address=10.10.1.1 login-by=http-chap,cookie,https
/ip hotspot user profile add name=dartbit-default shared-users=1 status-autorefresh=1m
/log info "Hotspot Profiles and Walled Garden initialized."

# 6. Firewall & NAT (Masquerade)
/ip firewall nat add action=masquerade chain=srcnat comment="dartbit NAT Rule"
/log info "Global NAT Masquerade rule added."

# 7. SNMP Monitoring
/snmp set enabled=yes contact="dartbit-hub" location="Kenya"
/snmp community add name=dartbit-public addresses=0.0.0.0/0 read-access=yes
/log info "SNMP monitoring community added."

# 8. Dedicated API Management User
# Credentials should be verified in the Hub dashboard after provisioning
:do { /user add name=dartbit group=full password=dartbit123 comment="dartbit API Bridge User" } on-error={ /log warning "User 'dartbit' already exists." }
/log info "API Management User created (User: dartbit)."

/log info "--- [DARTBIT] Provisioning Completed Successfully ---"
#-------------------------------------------------------------------------------
  `;
  
  res.send(rsc);
});

// SPA & Transpilation
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const filePath = path.join(__dirname, req.path.endsWith('/') ? req.path + 'index.html' : req.path);
  const candidates = [filePath, filePath + '.tsx', filePath + '.ts'];
  let found = null;
  for (const c of candidates) { if (fs.existsSync(c) && !fs.lstatSync(c).isDirectory()) { found = c; break; } }
  if (!found) return next();
  if (found.endsWith('html')) return res.sendFile(found);
  try {
    const code = fs.readFileSync(found, 'utf8');
    const result = await esbuild.transform(code, { loader: found.endsWith('x') ? 'tsx' : 'ts', target: 'esnext', format: 'esm', jsx: 'automatic' });
    res.set('Content-Type', 'application/javascript').send(result.code);
  } catch (err) { next(); }
});

app.use(express.static(__dirname));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 dartbit Core Online at http://0.0.0.0:${PORT}`));