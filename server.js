
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

const trafficCache = new Map();

async function getRouterConn(router) {
  return new RouterOSAPI({
    host: router.host,
    user: router.username || 'dartbit',
    password: router.password || 'dartbit123',
    port: parseInt(router.port) || 8728,
    timeout: 5
  });
}

/**
 * SYNC ENGINE: Push credentials to physical hardware
 */
async function syncClientToRouter(router, client) {
  const api = await getRouterConn(router);
  try {
    await api.connect();
    const isPpp = client.connectionType === 'PPPoE';
    const path = isPpp ? '/ppp/secret' : '/ip/hotspot/user';
    
    // Check if user exists
    const existing = await api.write(`${path}/print`, { [`?name`]: client.username });
    
    const params = {
      name: client.username,
      password: client.password || '1234',
      profile: isPpp ? 'prof-dartbit' : 'hsprof-dartbit',
      comment: `dartbit:${client.id}`
    };

    if (existing.length > 0) {
      await api.write(`${path}/set`, { '.id': existing[0]['.id'], ...params });
    } else {
      await api.write(`${path}/add`, params);
    }
    await api.close();
  } catch (e) {
    console.error(`Sync failed for router ${router.name}:`, e.message);
  }
}

async function getRouterStats(router) {
  const api = await getRouterConn(router);
  try {
    await api.connect();
    const resources = await api.write('/system/resource/print');
    const board = await api.write('/system/routerboard/print');
    const ppp = await api.write('/ppp/active/print');
    const hs = await api.write('/ip/hotspot/active/print');
    await api.close();

    const res = resources[0] || {};
    const brd = board[0] || {};
    
    return {
      ...router,
      status: 'ONLINE',
      cpu: parseInt(res['cpu-load']) || 0,
      memory: Math.round(parseInt(res['free-memory']) / (1024 * 1024)) || 0,
      totalMemory: Math.round(parseInt(res['total-memory']) / (1024 * 1024)) || 0,
      version: res['version'] || 'unknown',
      model: brd['model'] || res['board-name'] || 'MikroTik Hardware',
      sessions: ppp.length + hs.length,
      uptime: res['uptime'] || '0s',
      lastSync: new Date().toLocaleString()
    };
  } catch (err) {
    return { ...router, status: 'OFFLINE', cpu: 0, sessions: 0, uptime: 'Down' };
  }
}

app.get('/api/mikrotik/active-sessions', async (req, res) => {
  const routers = readJson(DB.routers).filter(r => r.status === 'ONLINE');
  const clients = readJson(DB.clients);
  const sessions = [];
  const now = Date.now();
  
  for (const router of routers) {
    const api = await getRouterConn(router);
    try {
      await api.connect();
      const ppp = await api.write('/ppp/active/print');
      const hs = await api.write('/ip/hotspot/active/print');
      await api.close();

      [...ppp, ...hs].forEach(s => {
        const username = s.name || s.user;
        const key = `${router.id}-${username}`;
        const bIn = parseInt(s['bytes-in']) || 0;
        const bOut = parseInt(s['bytes-out']) || 0;

        let dRate = 0, uRate = 0;
        const prev = trafficCache.get(key);
        if (prev) {
          const timeDelta = (now - prev.time) / 1000;
          if (timeDelta > 0) {
            uRate = Math.max(0, (bIn - prev.bIn) * 8 / timeDelta);
            dRate = Math.max(0, (bOut - prev.bOut) * 8 / timeDelta);
          }
        }
        trafficCache.set(key, { time: now, bIn, bOut });

        const clientInfo = clients.find(c => c.username === username);

        sessions.push({
          id: s['.id'],
          username: username,
          fullName: clientInfo ? clientInfo.fullName : 'Guest User',
          uptime: s.uptime,
          downloadRate: dRate,
          uploadRate: uRate,
          totalDownload: bOut,
          totalUpload: bIn,
          connectedNode: router.name,
          address: s.address || s['caller-id'] || 'Unknown'
        });
      });
    } catch (e) {}
  }
  res.json(sessions);
});

/**
 * PRODUCTION ZTP SCRIPT
 * Fixes: Captive Portal Detection, DNS Hijacking, and PPPoE Visibility
 */
app.get('/boot', (req, res) => {
  const hostHeader = req.headers.host || '127.0.0.1:5000';
  const serverIp = hostHeader.split(':')[0];
  const ip = req.query.ip === 'auto' ? req.ip : (req.query.ip || req.ip);
  const discovered = readJson(DB.discovery);
  
  if (!discovered.find(d => d.host === ip)) {
    discovered.push({ id: `d-${Date.now()}`, host: ip, seen: new Date().toISOString() });
    writeJson(DB.discovery, discovered);
  }

  res.set('Content-Type', 'text/plain');
  res.send(`
/log info "--- [DARTBIT] STARTING PRODUCTION ZTP ---";
:delay 1s;

# 1. Management & API
:do { /user add name=dartbit group=full password=dartbit123 comment="dartbit Engine"; } on-error={ /user set [find name=dartbit] password=dartbit123 group=full; };
/ip service enable api;
/ip service set api port=8728;

# 2. Bridge Configuration (Strict Auth Mode)
# Setting arp=reply-only ensures that only authenticated clients get an entry in the ARP table
:do { /interface bridge add name=br-subs comment="Authenticated Backbone" arp=reply-only; } on-error={ /interface bridge set [find name=br-subs] arp=reply-only; };

:for i from=2 to=10 do={
    :local ifName "ether$i";
    :do { /interface bridge port add bridge=br-subs interface=$ifName; } on-error={ /interface bridge port set [find interface=$ifName] bridge=br-subs; };
};

# 3. IP & DNS (DNS is mandatory for Captive Portal Detection)
:do { /ip pool add name=pool-subs ranges=10.50.10.10-10.50.10.250; } on-error={};
:do { /ip address add address=10.50.10.1/24 interface=br-subs; } on-error={};
/ip dns set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1;

# 4. DHCP Server (Triggers the 'Sign In' prompt on smartphones)
:do { /ip dhcp-server network add address=10.50.10.0/24 dns-server=10.50.10.1 gateway=10.50.10.1; } on-error={};
:do { /ip dhcp-server add address-pool=pool-subs disabled=no interface=br-subs name=dhcp-subs lease-time=1h; } on-error={};

# 5. PPPoE Server Configuration
# add-arp=yes is critical for the bridge's reply-only mode
:do { /ppp profile add name=prof-dartbit local-address=10.50.10.1 remote-address=pool-subs dns-server=10.50.10.1 change-tcp-mss=yes add-arp=yes; } on-error={};
:do { /interface pppoe-server server add disabled=no interface=br-subs service-name=dartbit-isp default-profile=prof-dartbit one-session-per-host=yes; } on-error={};

# 6. Hotspot Configuration
:do { /ip hotspot profile add name=hsprof-dartbit hotspot-address=10.50.10.1 login-by=http-chap,http-pap; } on-error={};
:do { /ip hotspot add name=hs-dartbit interface=br-subs profile=hsprof-dartbit address-pool=pool-subs disabled=no; } on-error={};
:do { /ip hotspot walled-garden add dst-host="${serverIp}" comment="Allow Portal Access"; } on-error={};

# 7. NAT & Mangle
/ip firewall nat add action=masquerade chain=srcnat out-interface=ether1 comment="Internet NAT";
/ip firewall mangle add action=change-mss chain=forward new-mss=1440 passthrough=yes protocol=tcp tcp-flags=syn tcp-mss=1441-65535 comment="PPPoE MSS Fix";

/log info "--- [DARTBIT] ZTP DEPLOYED & AUTH READY ---";
  `);
});

app.post('/api/clients', async (req, res) => {
  const clients = readJson(DB.clients);
  const newClient = req.body;
  const index = clients.findIndex(c => c.id === newClient.id);
  if (index !== -1) clients[index] = newClient;
  else clients.push(newClient);
  writeJson(DB.clients, clients);

  // Sync to all online routers immediately
  const routers = readJson(DB.routers).filter(r => r.status === 'ONLINE');
  for (const router of routers) {
    syncClientToRouter(router, newClient);
  }
  res.json({ success: true });
});

app.get('/api/routers', async (req, res) => {
  const routers = readJson(DB.routers);
  const updated = await Promise.all(routers.map(getRouterStats));
  writeJson(DB.routers, updated);
  res.json(updated);
});

app.post('/api/routers', (req, res) => { writeJson(DB.routers, req.body); res.json({ success: true }); });
app.delete('/api/routers/:id', (req, res) => {
  const routers = readJson(DB.routers).filter(r => r.id !== req.params.id);
  writeJson(DB.routers, routers);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => res.json({ success: true }));
app.get('/api/clients', (req, res) => res.json(readJson(DB.clients)));
app.get('/api/discovered', (req, res) => res.json(readJson(DB.discovery)));

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
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 dartbit ISP Engine Live on Port ${PORT}`));
