
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

// Monitoring Logic: Throughput cache for speed calculations
const throughputCache = {};

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
 * MONITORING LOGIC: Hardware Telemetry Retrieval
 */
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
      version: res['version'] || 'unknown',
      model: res['board-name'] || 'MikroTik Hardware',
      sessions: ppp.length + hs.length,
      uptime: res['uptime'] || '0s',
      lastSync: new Date().toLocaleString()
    };
  } catch (err) {
    return { ...router, status: 'OFFLINE', cpu: 0, sessions: 0, uptime: 'Down' };
  }
}

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
  } catch (e) {
    res.json({ success: true, message: 'Reboot initiated' });
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

/**
 * MONITORING LOGIC: Live Session Metrics
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

/**
 * PROVISIONING LOGIC: Error-Correcting ZTP Handshake
 */
app.get('/boot', (req, res) => {
  const ip = req.query.ip === 'auto' ? req.ip : (req.query.ip || req.ip);
  const discovered = readJson(DB.discovery);
  
  if (!discovered.find(d => d.host === ip)) {
    discovered.push({ id: `d-${Date.now()}`, host: ip, seen: new Date().toISOString() });
    writeJson(DB.discovery, discovered);
  }

  res.set('Content-Type', 'text/plain');
  res.send(`
/log info "--- [DARTBIT] ZTP HANDSHAKE STARTING ---"
:delay 1s

# Rectify "User Exists" error by using :do on-error
:do { 
    /user add name=dartbit group=full password=dartbit123 comment="dartbit Automation" 
} on-error={ 
    /user set [find name=dartbit] password=dartbit123 group=full comment="dartbit Automation (Updated)" 
}

/ip service enable api
/ip service set api port=8728

# Configure Bridge with error handling
:do { 
    /interface bridge add name=dartbit-bridge arp=reply-only 
} on-error={ 
    /interface bridge set [find name=dartbit-bridge] arp=reply-only 
}

:foreach i in=[/interface ethernet find where !(name~"ether1")] do={
    :local ifName [/interface ethernet get $i name]
    :do { /interface bridge port add bridge=dartbit-bridge interface=$ifName } on-error={}
}

/log info "--- [DARTBIT] ZTP PROVISIONING SUCCESSFUL ---"
  `);
});

app.get('/api/discovered', (req, res) => res.json(readJson(DB.discovery)));
app.post('/api/discovery/clear', (req, res) => { writeJson(DB.discovery, []); res.json({ success: true }); });
app.get('/api/health', (req, res) => res.json({ success: true }));

// Static Asset Serving & Build logic
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
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 dartbit ISP Backbone Online on Port ${PORT}`));
