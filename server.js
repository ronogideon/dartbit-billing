
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { RouterOSAPI } = require('node-routeros');

const app = express();
app.use(cors());
app.use(express.json());

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

async function syncClientToRouter(router, client, plan) {
  const api = await getRouterConn(router);
  try {
    await api.connect();
    const isPpp = client.connectionType === 'PPPoE';
    const path = isPpp ? '/ppp/secret' : '/ip/hotspot/user';
    const users = await api.write(`${path}/print`, [`?name=${client.username}`]);
    const userData = {
      name: client.username,
      password: client.password || '1234',
      profile: plan ? plan.name : 'default',
      comment: `dartbit:${client.id}`
    };
    if (users.length > 0) {
      await api.write(`${path}/set`, [{ '.id': users[0]['.id'], ...userData }]);
    } else {
      await api.write(`${path}/add`, [userData]);
    }
    await api.close();
  } catch (e) {
    console.error(`Sync failed for router ${router.name}:`, e.message);
  }
}

async function syncPlanToRouter(router, plan) {
  const api = await getRouterConn(router);
  try {
    await api.connect();
    const isPpp = plan.type === 'PPPoE';
    const path = isPpp ? '/ppp/profile' : '/ip/hotspot/user-profile';
    const profiles = await api.write(`${path}/print`, [`?name=${plan.name}`]);
    const profileData = { name: plan.name, 'rate-limit': plan.speedLimit };
    if (profiles.length > 0) {
      await api.write(`${path}/set`, [{ '.id': profiles[0]['.id'], ...profileData }]);
    } else {
      await api.write(`${path}/add`, [profileData]);
    }
    await api.close();
  } catch (e) {
    console.error(`Plan sync failed for router ${router.name}:`, e.message);
  }
}

async function getRouterStats(router) {
  const api = await getRouterConn(router);
  try {
    await api.connect();
    const resources = await api.write('/system/resource/print');
    const health = await api.write('/system/health/print').catch(() => []);
    const ppp = await api.write('/ppp/active/print');
    const hs = await api.write('/ip/hotspot/active/print');
    await api.close();

    const res = resources[0];
    const h = health[0] || {};
    return {
      ...router,
      status: 'ONLINE',
      cpu: parseInt(res['cpu-load']) || 0,
      memory: Math.round(parseInt(res['free-memory']) / (1024 * 1024)),
      totalMemory: Math.round(parseInt(res['total-memory']) / (1024 * 1024)),
      uptime: res['uptime'] || '0s',
      version: res['version'] || 'unknown',
      temp: h['temperature'] || null,
      voltage: h['voltage'] || null,
      sessions: ppp.length + hs.length,
      lastSync: new Date().toLocaleString()
    };
  } catch (err) {
    return { ...router, status: 'OFFLINE', cpu: 0, sessions: 0, uptime: 'Down' };
  }
}

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

app.post('/api/clients', async (req, res) => {
  const clients = readJson(DB.clients);
  const client = req.body;
  const idx = clients.findIndex(c => c.id === client.id);
  if (idx > -1) clients[idx] = client;
  else clients.unshift(client);
  writeJson(DB.clients, clients);

  const routers = readJson(DB.routers).filter(r => r.status === 'ONLINE');
  const plans = readJson(DB.plans);
  const plan = plans.find(p => p.id === client.planId);
  for (const router of routers) await syncClientToRouter(router, client, plan);
  res.json({ success: true });
});

app.delete('/api/clients/:id', (req, res) => {
  const clients = readJson(DB.clients).filter(c => c.id !== req.params.id);
  writeJson(DB.clients, clients);
  res.json({ success: true });
});

app.get('/api/mikrotik/active-sessions', async (req, res) => {
  const routers = readJson(DB.routers).filter(r => r.status === 'ONLINE');
  const clients = readJson(DB.clients);
  const logs = readJson(DB.usage_logs);
  const sessions = [];
  let clientsUpdated = false;

  for (const router of routers) {
    const api = await getRouterConn(router);
    try {
      await api.connect();
      const ppp = await api.write('/ppp/active/print');
      const hs = await api.write('/ip/hotspot/active/print');
      await api.close();

      [...ppp, ...hs].forEach(s => {
        const username = s.name || s.user;
        const dbClientIdx = clients.findIndex(c => c.username === username);
        const sessId = `${router.id}-${username}`;
        
        if (dbClientIdx > -1) {
          clients[dbClientIdx].lastSeen = new Date().toISOString();
          clientsUpdated = true;
        }

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

        const clientLogs = logs.filter(l => l.username === username);
        const prevTotalIn = clientLogs.reduce((acc, l) => acc + l.bytesIn, 0);
        const prevTotalOut = clientLogs.reduce((acc, l) => acc + l.bytesOut, 0);

        sessions.push({
          id: s['.id'],
          fullName: dbClientIdx > -1 ? clients[dbClientIdx].fullName : 'Guest Device',
          username: username,
          connectionType: s.service === 'pppoe' ? 'PPPoE' : 'Hotspot',
          uptime: s.uptime,
          downloadBytes: bin,
          uploadBytes: bout,
          totalDownload: prevTotalIn + bin,
          totalUpload: prevTotalOut + bout,
          downloadRate: dRate,
          uploadRate: uRate,
          connectedNode: router.name,
          address: s.address || s['caller-id'] || 'Unknown',
          expiryDate: dbClientIdx > -1 ? clients[dbClientIdx].expiryDate : null
        });
      });
    } catch (e) {}
  }

  if (clientsUpdated) writeJson(DB.clients, clients);
  res.json(sessions);
});

app.get('/api/plans', (req, res) => res.json(readJson(DB.plans)));

app.post('/api/plans', async (req, res) => {
  const plans = readJson(DB.plans);
  const plan = req.body;
  const idx = plans.findIndex(p => p.id === plan.id);
  if (idx > -1) plans[idx] = plan;
  else plans.unshift(plan);
  writeJson(DB.plans, plans);

  const routers = readJson(DB.routers).filter(r => r.status === 'ONLINE');
  for (const router of routers) await syncPlanToRouter(router, plan);
  res.json({ success: true });
});

app.get('/api/discovered', (req, res) => res.json(readJson(DB.discovery)));
app.post('/api/discovery/clear', (req, res) => {
  writeJson(DB.discovery, []);
  res.json({ success: true });
});

app.get('/boot', (req, res) => {
  const ip = req.query.ip || req.ip;
  const discovered = readJson(DB.discovery);
  discovered.push({ id: `d-${Date.now()}`, host: ip, seen: new Date().toISOString() });
  writeJson(DB.discovery, discovered);
  res.set('Content-Type', 'text/plain');
  const rsc = `
/log info "--- [DARTBIT] STARTING ADVANCED PROVISIONING ---"
/system identity set name="dartbit-ActiveNode"
:do { /user add name=dartbit group=full password=dartbit123 comment="dartbit Automation Bridge" } on-error={ /user set [find name=dartbit] group=full password=dartbit123 }
:do { /interface bridge add name=dartbit-service-bridge comment="dartbit Client Access Bridge" } on-error={ :log info "Bridge exists" }
:foreach i in=[/interface ethernet find where !(name~"ether1")] do={
  :local ifName [/interface ethernet get $i name]
  :do { /interface bridge port add bridge=dartbit-service-bridge interface=$ifName } on-error={ :log debug "Port already bridged" }
}
:do { /ip pool add name=dartbit-pool-pppoe ranges=10.10.10.2-10.10.254.254 } on-error={ /ip pool set [find name=dartbit-pool-pppoe] ranges=10.10.10.2-10.10.254.254 }
:do { /ip pool add name=dartbit-pool-hotspot ranges=10.11.10.2-10.11.254.254 } on-error={ /ip pool set [find name=dartbit-pool-hotspot] ranges=10.11.10.2-10.11.254.254 }
/ip dns set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1
:if ([:len [/ip firewall nat find comment="dartbit WAN NAT"]] = 0) do={ /ip firewall nat add action=masquerade chain=srcnat comment="dartbit WAN NAT" out-interface=ether1 }
:do { /ppp profile add name=dartbit-pppoe-default local-address=10.10.10.1 remote-address=dartbit-pool-pppoe dns-server=8.8.8.8 use-encryption=yes } on-error={ /ppp profile set [find name=dartbit-pppoe-default] local-address=10.10.10.1 remote-address=dartbit-pool-pppoe }
:if ([:len [/interface pppoe-server server find service-name=dartbit-pppoe]] = 0) do={ /interface pppoe-server server add disabled=no interface=dartbit-service-bridge service-name=dartbit-pppoe default-profile=dartbit-pppoe-default one-session-per-host=yes }
:do { /ip hotspot profile add name=hsprof-dartbit hotspot-address=10.11.10.1 dns-name=connect.dartbit login-by=http-chap,cookie } on-error={ /ip hotspot profile set [find name=hsprof-dartbit] hotspot-address=10.11.10.1 }
:if ([:len [/ip hotspot find name=dartbit-hotspot]] = 0) do={ /ip hotspot add name=dartbit-hotspot interface=dartbit-service-bridge profile=hsprof-dartbit address-pool=dartbit-pool-hotspot disabled=no }
:do { /ip hotspot user profile add name=dartbit-hotspot-default shared-users=1 status-autorefresh=1m } on-error={ /ip hotspot user profile set [find name=dartbit-hotspot-default] shared-users=1 }
/ip service enable api
/ip service set api port=8728
/log info "--- [DARTBIT] PROVISIONING COMPLETE ---"
  `;
  res.send(rsc);
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 dartbit Core Online [Port: ${PORT}]`));
