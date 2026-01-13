
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

// Monitoring Logic: Persistence for traffic rate calculations
const trafficHistory = {};

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
 * MONITORING LOGIC: Comprehensive Hardware Telemetry
 */
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

/**
 * MONITORING LOGIC: Real-time Live Traffic Rate Engine
 */
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

      const allActive = [...ppp, ...hs];
      const now = Date.now();

      allActive.forEach(s => {
        const username = s.name || s.user;
        const key = `${router.id}-${username}`;
        const bIn = parseInt(s['bytes-in']) || 0;
        const bOut = parseInt(s['bytes-out']) || 0;

        let downloadRate = 0;
        let uploadRate = 0;

        if (trafficHistory[key]) {
          const prev = trafficHistory[key];
          const timeDelta = (now - prev.time) / 1000;
          if (timeDelta > 0) {
            // bps = (delta bytes * 8 bits) / seconds
            uploadRate = Math.max(0, (bIn - prev.bIn) * 8 / timeDelta);
            downloadRate = Math.max(0, (bOut - prev.bOut) * 8 / timeDelta);
          }
        }

        trafficHistory[key] = { time: now, bIn, bOut };

        sessions.push({
          id: s['.id'],
          username: username,
          uptime: s.uptime,
          downloadRate: downloadRate,
          uploadRate: uploadRate,
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
 * PROVISIONING LOGIC: ZTP Deployment Script (Syntactically Correct for ROS v6/v7)
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
/log info "--- [DARTBIT] ADVANCED PROVISIONING INITIATED ---"
:delay 1s

# 1. Identity & Security Setup (Semicolon added inside braces)
:do { 
    /user add name=dartbit group=full password=dartbit123 comment="dartbit Automation Bridge";
} on-error={ 
    /user set [find name=dartbit] password=dartbit123 group=full comment="dartbit Automation Bridge";
}
/ip service enable api
/ip service set api port=8728

# 2. Bridge & Network Topology
:do { 
    /interface bridge add name=br-subs comment="dartbit Subscriber Bridge" arp=reply-only;
} on-error={ 
    /interface bridge set [find name=br-subs] arp=reply-only;
}

:foreach i in=[/interface ethernet find where !(name~"ether1")] do={
    :local ifName [/interface ethernet get $i name];
    :do { /interface bridge port add bridge=br-subs interface=$ifName; } on-error={};
}

# 3. IP Services & Pools
:do { /ip pool add name=pool-subs ranges=10.50.10.2-10.50.10.254; } on-error={};
:do { /ip address add address=10.50.10.1/24 interface=br-subs; } on-error={};

# 4. PPPoE Server Configuration
:do { /ppp profile add name=prof-dartbit local-address=10.50.10.1 remote-address=pool-subs dns-server=8.8.8.8 use-encryption=yes; } on-error={};
:do { /interface pppoe-server server add disabled=no interface=br-subs service-name=dartbit-pppoe default-profile=prof-dartbit one-session-per-host=yes; } on-error={};

# 5. Hotspot & Walled Garden
:do { /ip hotspot profile add name=hsprof-dartbit hotspot-address=10.50.10.1 login-by=http-chap,http-paper; } on-error={};
:do { /ip hotspot add name=hs-dartbit interface=br-subs profile=hsprof-dartbit address-pool=pool-subs disabled=no; } on-error={};
:do { /ip hotspot walled-garden add dst-host="${serverIp}" comment="Allow Billing Portal Access"; } on-error={};

# 6. Firewall & Mangle Logic
/ip firewall nat add action=masquerade chain=srcnat comment="dartbit NAT" out-interface=ether1
/ip firewall mangle add action=change-mss chain=forward new-mss=1440 passthrough=yes protocol=tcp tcp-flags=syn tcp-mss=1441-65535 comment="Fix PPPoE MSS"

# 7. Protect Router Input
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=8728 comment="Allow dartbit API"
/ip firewall filter add chain=input action=accept connection-state=established,related
/ip firewall filter add chain=input action=drop in-interface=!ether1 comment="Restrict Local Access"

/log info "--- [DARTBIT] ZTP CONFIGURATION APPLIED SUCCESSFULLY ---"
  `);
});

/**
 * CONTROL LOGIC: Remote Hardware Actions
 */
app.post('/api/routers/:id/reboot', async (req, res) => {
  const routers = readJson(DB.routers);
  const router = routers.find(r => r.id === req.params.id);
  if (!router) return res.status(404).json({ error: 'Router not found' });
  const api = await getRouterConn(router);
  try {
    await api.connect();
    await api.write('/system/reboot');
    res.json({ success: true });
  } catch (e) { res.json({ success: true, message: 'Rebooting' }); }
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

app.get('/api/discovered', (req, res) => res.json(readJson(DB.discovery)));
app.post('/api/discovery/clear', (req, res) => { writeJson(DB.discovery, []); res.json({ success: true }); });
app.get('/api/health', (req, res) => res.json({ success: true }));

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
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 dartbit ISP Backbone Live on Port ${PORT}`));
