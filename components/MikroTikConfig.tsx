
import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Plus, 
  Copy, 
  Zap, 
  X, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Globe, 
  WifiOff, 
  MoreHorizontal, 
  Layout, 
  RefreshCw,
  Cpu,
  Database,
  Terminal,
  ShieldCheck,
  Lock,
  User,
  Hash
} from 'lucide-react';
import { mikrotikService } from '../services/mikrotikService.ts';
import { RouterStatus, RouterNode } from '../types.ts';

const MikroTikConfig: React.FC = () => {
  const [routers, setRouters] = useState<RouterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<'idle' | 'waiting' | 'naming'>('idle');
  const [discoveredInfo, setDiscoveredInfo] = useState<any>(null);
  
  const [newRouter, setNewRouter] = useState({
    name: '',
    username: 'admin',
    password: '',
    port: '8728'
  });

  const [serverIp, setServerIp] = useState(window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const cleanServerIp = serverIp.replace(/^https?:\/\//, '').split('/')[0].trim() || '127.0.0.1';
  const pollIntervalRef = useRef<any>(null);

  const loadRouters = async () => {
    if (routers.length === 0) setLoading(true);
    try {
      const fetched = await mikrotikService.getRouters();
      setRouters(fetched);
    } catch (err) {
      console.error("Failed to load routers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRouters();
    const interval = setInterval(loadRouters, 10000); // Live hardware status sync
    const handleClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleClick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  const handleStartProvisioning = async () => {
    await mikrotikService.clearDiscovery();
    setDiscoveryStatus('waiting');
    setIsProvisioning(true);
  };

  useEffect(() => {
    if (isProvisioning && discoveryStatus === 'waiting') {
      pollIntervalRef.current = setInterval(async () => {
        const found = await mikrotikService.discoverRouters();
        if (found && Array.isArray(found) && found.length > 0) {
            const first = found[found.length - 1]; // Get latest
            setDiscoveredInfo(first);
            setDiscoveryStatus('naming');
            setNewRouter(prev => ({ ...prev, name: first.name }));
            clearInterval(pollIntervalRef.current);
        }
      }, 3000);
    }
    return () => clearInterval(pollIntervalRef.current);
  }, [isProvisioning, discoveryStatus]);

  const handleFinalizeNaming = async () => {
    if (!newRouter.name || !discoveredInfo) return;
    const newNode: RouterNode = {
      id: discoveredInfo.id || `r-${Date.now()}`,
      name: newRouter.name,
      host: discoveredInfo.host,
      username: newRouter.username,
      password: newRouter.password,
      port: parseInt(newRouter.port),
      status: RouterStatus.ONLINE,
      cpu: 0, 
      memory: 0, 
      sessions: 0, 
      uptime: '0s', 
      lastSync: new Date().toLocaleString()
    };
    
    setActionLoading('provision');
    try {
      const current = await mikrotikService.getRouters();
      const updated = [newNode, ...current];
      await mikrotikService.saveRouters(updated);
      await loadRouters();
      setIsProvisioning(false);
      setDiscoveryStatus('idle');
    } catch (err) {
      alert("Provisioning failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRouter = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this node?")) return;
    setActionLoading(id);
    try {
      await mikrotikService.deleteRouter(id);
      await loadRouters();
    } catch (err) {
      alert("Delete failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const loaderCommand = `/tool fetch url="http://${cleanServerIp}:5000/boot?ip=${cleanServerIp}" dst-path=netpulse.rsc; :delay 3s; /import netpulse.rsc`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3">
              <Network className="text-blue-600" size={24} />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Access Nodes</h1>
           </div>
           <p className="text-slate-500 text-sm mt-1">Live resource monitoring for your MikroTik fleet.</p>
        </div>
        <button 
          onClick={handleStartProvisioning} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={18} /> Provision New Node
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading && routers.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Hardware Inventory...</p>
          </div>
        ) : routers.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center px-10">
            <Network size={48} className="text-slate-100 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Nodes Provisioned</h3>
            <p className="text-slate-400 text-sm">Provision a router to start real-time monitoring.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Board Name</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">CPU Load</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">RAM Available</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routers.map((router) => (
                  <tr key={router.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${router.status === RouterStatus.ONLINE ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Network size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{router.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{router.host}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full transition-all ${router.cpu > 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${router.cpu}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600">{router.cpu}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Database size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">{router.memory} / {router.totalMemory || '??'} MB</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        router.status === RouterStatus.ONLINE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {router.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === router.id ? null : router.id); }}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {activeMenuId === router.id && (
                        <div className="absolute right-8 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
                          <button onClick={(e) => handleDeleteRouter(e, router.id)} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50">
                            <Trash2 size={14} /> Delete Node
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isProvisioning && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">Node Onboarding</h2>
                <button onClick={() => setIsProvisioning(false)} className="p-2 text-slate-400 hover:text-slate-900"><X size={28} /></button>
            </div>
            
            <div className="p-8 space-y-6">
              {discoveryStatus === 'waiting' ? (
                  <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                          <Globe size={12} /> Dashboard Bridge Host
                        </label>
                        <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={serverIp} onChange={(e) => setServerIp(e.target.value)} />
                      </div>
                      <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[11px] text-blue-300 break-all relative border border-slate-800 leading-relaxed shadow-inner">
                          {loaderCommand}
                          <button onClick={() => { navigator.clipboard.writeText(loaderCommand); alert("Copied!"); }} className="absolute right-4 top-4 p-2 bg-white/10 rounded-lg"><Copy size={16} /></button>
                      </div>
                      <div className="flex flex-col items-center gap-3 py-4">
                        <Loader2 className="animate-spin text-blue-600" size={24}/>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Awaiting Peer Signal...</span>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-6 animate-in zoom-in-95">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Friendly Name</label>
                          <div className="relative">
                            <Network className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={newRouter.name} onChange={(e) => setNewRouter({...newRouter, name: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase">API Port (Default 8728)</label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={newRouter.port} onChange={(e) => setNewRouter({...newRouter, port: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase">API Username</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={newRouter.username} onChange={(e) => setNewRouter({...newRouter, username: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase">API Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="password" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={newRouter.password} onChange={(e) => setNewRouter({...newRouter, password: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleFinalizeNaming} 
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl"
                      >
                        {actionLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                        Finalize & Connect
                      </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MikroTikConfig;
