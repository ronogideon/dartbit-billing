
import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Plus, 
  Copy, 
  Zap, 
  X, 
  Trash2, 
  Loader2, 
  Globe, 
  MoreHorizontal, 
  Database,
  ShieldCheck,
  Lock,
  User,
  Hash,
  AlertTriangle,
  RefreshCw,
  Server,
  Cable
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
    username: 'dartbit',
    password: 'dartbit123',
    port: '8728'
  });

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    const interval = setInterval(loadRouters, 10000);
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

  const pollIntervalRef = useRef<any>(null);
  useEffect(() => {
    if (isProvisioning && discoveryStatus === 'waiting') {
      pollIntervalRef.current = setInterval(async () => {
        const found = await mikrotikService.discoverRouters();
        if (found && Array.isArray(found) && found.length > 0) {
            const first = found[found.length - 1];
            setDiscoveredInfo(first);
            setDiscoveryStatus('naming');
            setNewRouter(prev => ({ ...prev, name: 'Node-' + first.host.split('.').pop() }));
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
      await mikrotikService.saveRouters([newNode, ...current]);
      await loadRouters();
      setIsProvisioning(false);
      setDiscoveryStatus('idle');
    } catch (err) {
      alert("Failed to connect to node API.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRouter = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this node?")) return;
    setActionLoading(id);
    try {
      await mikrotikService.deleteRouter(id);
      await loadRouters();
    } catch (err) {} finally { setActionLoading(null); }
  };

  // Using the production URL provided by the user for the provisioning script
  const baseUrl = "https://dartbit-billing-production.up.railway.app";
  const loaderCommand = `/tool fetch url="${baseUrl}/boot?ip=auto" dst-path=dartbit.rsc check-certificate=no; :delay 2s; /import dartbit.rsc`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3">
              <Network className="text-blue-600" size={24} />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Access Nodes</h1>
           </div>
           <p className="text-slate-500 text-sm mt-1 font-medium">Live hardware and resource status across your network.</p>
        </div>
        <button 
          onClick={handleStartProvisioning} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={18} /> Add New Router
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {loading && routers.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Scanning Network Hardware...</p>
          </div>
        ) : routers.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center px-10">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Network size={40} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Nodes</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">Start by provisioning your first MikroTik router to monitor CPU, RAM, and active sessions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Board Name</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Resources</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Sessions</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routers.map((router) => (
                  <tr key={router.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${router.status === RouterStatus.ONLINE ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Server size={20} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">{router.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold">{router.host}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2 max-w-[120px] mx-auto">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span>CPU Load</span>
                          <span className={router.cpu > 80 ? 'text-red-500' : 'text-slate-900'}>{router.cpu}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full transition-all ${router.cpu > 80 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${router.cpu}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-sm font-black text-slate-900">{router.sessions}</span>
                         <span className="text-[9px] font-bold text-slate-500 uppercase">Live Clients</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        router.status === RouterStatus.ONLINE ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${router.status === RouterStatus.ONLINE ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        {router.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === router.id ? null : router.id); }}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-all rounded-lg hover:bg-white"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {activeMenuId === router.id && (
                        <div className="absolute right-8 top-14 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 animate-in zoom-in-95">
                          <button onClick={(e) => handleDeleteRouter(e, router.id)} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50">
                            <Trash2 size={16} /> Remove Node
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
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <Zap size={20} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Onboarding Wizard</h2>
                </div>
                <button onClick={() => setIsProvisioning(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto">
              {discoveryStatus === 'waiting' ? (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
                        <Cable className="text-blue-600 shrink-0" size={24} />
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-blue-900">Auto-Port Configuration</h4>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            Connect your uplink fiber/ethernet to <strong>Ether1</strong>. 
                            The system will bridge all other ports (Ether2+) for client access automatically.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Provisioning Command</label>
                        <div className="bg-slate-900 rounded-2xl p-6 font-mono text-xs text-blue-300 break-all relative group shadow-inner border border-slate-800 leading-relaxed">
                            {loaderCommand}
                            <button onClick={() => navigator.clipboard.writeText(loaderCommand)} className="absolute right-4 top-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                              <Copy size={18} />
                            </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4 py-6 border-2 border-dashed border-slate-200 rounded-3xl">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-25"></div>
                          <div className="relative bg-blue-600 p-3 rounded-full text-white">
                            <RefreshCw size={24} className="animate-spin" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Listening for Node Pulse</p>
                        </div>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-8 animate-in zoom-in-95">
                      <div className="p-6 bg-green-50 border border-green-100 rounded-2xl flex gap-4">
                        <ShieldCheck className="text-green-600 shrink-0" size={24} />
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-green-900">Node Identified</h4>
                          <p className="text-xs text-green-700">Router detected at <strong>{discoveredInfo.host}</strong>. Provisioning bridge now.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Node Display Name</label>
                          <div className="relative">
                            <Network className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.name} onChange={(e) => setNewRouter({...newRouter, name: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">API Port</label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.port} onChange={(e) => setNewRouter({...newRouter, port: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Auth User</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.username} onChange={(e) => setNewRouter({...newRouter, username: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Auth Token</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="password" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.password} onChange={(e) => setNewRouter({...newRouter, password: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleFinalizeNaming} 
                        disabled={!!actionLoading}
                        className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
                      >
                        {actionLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                        Publish Node to Cloud
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
