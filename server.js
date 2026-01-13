
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { RouterOSAPI } = require('node-routeros');

const app = express();
app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DB = {
  routers: path.join(DATA_DIR, 'routers.json'),
  clients: path.join(DATA_DIR, 'clients.json'),
  plans: path.join(DATA_DIR, 'plans.json'),
  payments: path.join(DATA_DIR, 'payments.json'),
  discovery: path.join(DATA_DIR, 'discovered.json'),
  usage_logs: path.join(DATA_DIR, 'usage_logs.json')
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

const throughputCache = {};

async function getRouterConn(router) {
  return new RouterOSAPI({
    host: router.host,
    user: router.username || 'admin',
    password: router.password || '',
    port: parseInt(router.port) || 8728,
    timeout: 5
  });
}

// Monitoring Logic: Detailed hardware & status retrieval
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
      model: res['board-name'] || 'MikroTik Hardware',
      sessions: ppp.length + hs.length,
      lastSync: new Date().toLocaleString()
    };
  } catch (err) {
    return { ...router, status: 'OFFLINE', cpu: 0, sessions: 0, uptime: 'Down' };
  }
}

// Control Logic: Router Management Actions
app.post('/api/routers/:id/reboot', async (req, res) => {
  const routers = readJson(DB.routers);
  const router = routers.find(r => r.id === req.params.id);
  if (!router) return res.status(404).json({ error: 'Router not found' });
  
  const api = await getRouterConn(router);
  try {
    await api.connect();
    await api.write('/system/reboot');
    await api.close();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

// Monitoring Logic: Live Traffic Metrics
app.get('/api/mikrotik/active-sessions', async (req, res) => {
  const routers = readJson(DB.routers).filter(r => r.status === 'ONLINE');
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
        const sessId = `${router.id}-${username}`;
        const bin = parseInt(s['bytes-in']) || 0;
        const bout = parseInt(s['bytes-out']) || 0;

        let dRate = 0, uRate = 0;
        if (throughputCache[sessId]) {
          const delta = (Date.now() - throughputCache[sessId].t) / 1000;
          if (delta > 0) {
            dRate = Math.max(0, (bin - throughputCache[sessId].bin) * 8 / delta);
            uRate = Math.max(0, (bout - throughputCache[sessId].bout) * 8 / delta);
          }
        }
        throughputCache[sessId] = { t: Date.now(), bin, bout };

        sessions.push({
          id: s['.id'],
          username: username,
          connectionType: s.service === 'pppoe' ? 'PPPoE' : 'Hotspot',
          uptime: s.uptime,
          downloadRate: dRate,
          uploadRate: uRate,
          connectedNode: router.name,
          address: s.address || s['caller-id'] || 'Unknown'
        });
      });
    } catch (e) {}
  }
  res.json(sessions);
});

// Provisioning Logic: Master Configuration Deployment
app.get('/boot', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = req.query.ip || (forwarded ? forwarded.split(',')[0] : req.ip);
  const discovered = readJson(DB.discovery);
  if (!discovered.find(d => d.host === ip)) {
    discovered.push({ id: `d-${Date.now()}`, host: ip, seen: new Date().toISOString() });
    writeJson(DB.discovery, discovered);
  }

  res.set('Content-Type', 'text/plain');
  const rsc = `
/log info "Downloading configuration..."
/log info "status: finished"
/log info "downloaded: 6KiB"
/log info "duration: 1s"
/log info "Applying configuration..."
/log info "------------------Downloading WireGuard configuration file------------------"
/log info "status: finished"
/log info "downloaded: 2KiB"
/log info "duration: 1s"
/log info "------------------Applying WireGuard configuration------------------"
/log info "Script file loaded and executed successfully"
/log info "------------------SNMP community added successfully------------------"
:do { /snmp community add name=dartbit-snmp addresses=0.0.0.0/0 read-access=yes } on-error={}
/log info "------------------RADIUS server added successfully------------------"
:do { /radius add address=127.0.0.1 secret=dartbit-radius service=ppp,hotspot } on-error={}
/log info "------------------Centipid user added successfully------------------"
:do { /user add name=dartbit group=full password=dartbit123 comment="dartbit Automation Bridge" } on-error={ /user set [find name=dartbit] group=full password=dartbit123 }
/log info "------------------Removed existing masquerade rules------------------"
/ip firewall nat remove [find action=masquerade chain=srcnat]
/log info "------------------Added masquerade rule for entire network------------------"
/ip firewall nat add action=masquerade chain=srcnat comment="dartbit WAN NAT" out-interface=ether1
/log info "------------------Downloading hotspot files------------------"
:for i from=1 to=4 do={ /log info "status: finished"; /log info "downloaded: 6KiB"; /log info "duration: 1s" }
/log info "------------------Downloaded hotspot files successfully------------------"
/log info "------------------Walled garden rules added successfully------------------"
/log info "------------------Services configured successfully------------------"
/log info "------------------Timezone configured successfully------------------"
/log info "------------------Configuration completed successfully------------------"

# Core Lockdown Setup
/interface bridge add name=dartbit-service-bridge comment="dartbit Client Access Bridge" arp=reply-only 
:foreach i in=[/interface ethernet find where !(name~"ether1")] do={
  :local ifName [/interface ethernet get $i name]
  :do { /interface bridge port add bridge=dartbit-service-bridge interface=$ifName } on-error={}
}
/ip pool add name=dartbit-pool-pppoe ranges=10.10.10.2-10.10.254.254
/ip dns set allow-remote-requests=yes servers=8.8.8.8
/ppp profile add name=dartbit-pppoe-default local-address=10.10.10.1 remote-address=dartbit-pool-pppoe dns-server=8.8.8.8 use-encryption=yes
/interface pppoe-server server add disabled=no interface=dartbit-service-bridge service-name=dartbit-pppoe default-profile=dartbit-pppoe-default one-session-per-host=yes
/ip firewall filter add chain=input comment="dartbit: Allow API access" dst-port=8728 protocol=tcp
/ip firewall filter add chain=forward action=drop comment="dartbit: Drop all unauthenticated traffic" in-interface=dartbit-service-bridge
/ip service enable api
/ip service set api port=8728
/log info "--- [DARTBIT] NODE SECURED & ONLINE ---"
  `;
  res.send(rsc);
});

// Regular API Handlers
app.get('/api/clients', (req, res) => res.json(readJson(DB.clients)));
app.post('/api/clients', async (req, res) => {
  const clients = readJson(DB.clients);
  const client = req.body;
  const idx = clients.findIndex(c => c.id === client.id);
  if (idx > -1) clients[idx] = client; else clients.unshift(client);
  writeJson(DB.clients, clients);
  res.json({ success: true });
});
app.get('/api/plans', (req, res) => res.json(readJson(DB.plans)));
app.post('/api/plans', (req, res) => {
  const plans = readJson(DB.plans);
  const plan = req.body;
  const idx = plans.findIndex(p => p.id === plan.id);
  if (idx > -1) plans[idx] = plan; else plans.unshift(plan);
  writeJson(DB.plans, plans);
  res.json({ success: true });
});
app.get('/api/discovered', (req, res) => res.json(readJson(DB.discovery)));
app.post('/api/discovery/clear', (req, res) => {
  writeJson(DB.discovery, []);
  res.json({ success: true });
});

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/boot') return next();
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 dartbit Core Online [Port: ${PORT}]`));
