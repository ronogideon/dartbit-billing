
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
  Cable,
  ArrowUpDown,
  Power
} from 'lucide-react';
import { mikrotikService } from '../services/mikrotikService.ts';
import { RouterStatus, RouterNode } from '../types.ts';

const MikroTikConfig: React.FC = () => {
  const [routers, setRouters] = useState<RouterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<'idle' | 'waiting' | 'naming'>('idle');
  const [discoveredInfo, setDiscoveredInfo] = useState<any>(null);
  const [sortKey, setSortKey] = useState<keyof RouterNode>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
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
    const interval = setInterval(loadRouters, 5000); // 5s for better "Live" feel
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
      alert("Handshake failed. Ensure Port 8728 is open.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReboot = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Reboot this router hardware?")) return;
    setActionLoading(id);
    try {
      await mikrotikService.rebootRouter(id);
      setActiveMenuId(null);
    } catch (err) {
      alert("Reboot command failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRouter = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this node from Cloud Directory?")) return;
    setActionLoading(id);
    try {
      await mikrotikService.deleteRouter(id);
      await loadRouters();
    } catch (err) {} finally { setActionLoading(null); }
  };

  const handleSort = (key: keyof RouterNode) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortedRouters = [...routers].sort((a, b) => {
    const valA = a[sortKey] || '';
    const valB = b[sortKey] || '';
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const baseUrl = "https://dartbit-billing-production.up.railway.app";
  const loaderCommand = `/tool fetch url="${baseUrl}/boot?ip=auto" dst-path=dartbit.rsc check-certificate=no; :delay 2s; /import dartbit.rsc`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3">
              <Network className="text-blue-600" size={24} />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Nodes</h1>
           </div>
           <p className="text-slate-500 text-sm mt-1 font-medium italic">Monitoring {routers.length} gateways in the cloud backbone.</p>
        </div>
        <button 
          onClick={handleStartProvisioning} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={18} /> Provision New Hardware
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden">
        {loading && routers.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Hardware State...</p>
          </div>
        ) : routers.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center px-10">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
              <Network size={40} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Active Nodes Identified</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">Provision your first MikroTik router to start managing PPPoE/Hotspot subscribers from this dashboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th onClick={() => handleSort('name')} className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest cursor-pointer group">
                    <div className="flex items-center gap-2">Board Name <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </th>
                  <th onClick={() => handleSort('model')} className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest cursor-pointer group">
                    <div className="flex items-center gap-2">Model Variation <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">Resources</th>
                  <th onClick={() => handleSort('sessions')} className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center cursor-pointer group">
                    <div className="flex items-center justify-center gap-2">Clients <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest">Connectivity</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedRouters.map((router) => (
                  <tr key={router.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${router.status === RouterStatus.ONLINE ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-400'}`}>
                          <Server size={22} />
                        </div>
                        <div>
                          <span className="text-base font-bold text-slate-900 block">{router.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold tracking-tight">{router.host}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{router.model || 'Unknown Model'}</span>
                          <span className="text-[9px] font-black text-blue-600 uppercase">v{router.version || '0.0.0'}</span>
                       </div>
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex flex-col gap-2 max-w-[120px] mx-auto">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                          <span>CPU LOAD</span>
                          <span className={router.cpu > 80 ? 'text-red-600 font-black' : 'text-slate-900'}>{router.cpu}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                           <div className={`h-full transition-all duration-1000 ${router.cpu > 80 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${router.cpu}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-xl font-black text-slate-900 tracking-tight">{router.sessions}</span>
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Presence</span>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        router.status === RouterStatus.ONLINE ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${router.status === RouterStatus.ONLINE ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        {router.status}
                      </span>
                    </td>
                    <td className="px-10 py-7 text-right relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === router.id ? null : router.id); }}
                        className="p-2.5 text-slate-400 hover:text-slate-900 transition-all rounded-xl hover:bg-white"
                      >
                        <MoreHorizontal size={24} />
                      </button>
                      {activeMenuId === router.id && (
                        <div className="absolute right-10 top-16 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-1.5 animate-in zoom-in-95 overflow-hidden">
                          <button 
                            onClick={(e) => handleReboot(e, router.id)} 
                            className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            {actionLoading === router.id ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <Power size={16} className="text-blue-600" />} 
                            Reboot Node
                          </button>
                          <div className="h-px bg-slate-100 mx-2 my-1"></div>
                          <button 
                            onClick={(e) => handleDeleteRouter(e, router.id)} 
                            className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black uppercase text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} /> Delete Hardware
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4 text-slate-900">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20">
                    <Zap size={24} />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Onboarding Wizard</h2>
                </div>
                <button onClick={() => setIsProvisioning(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={36} /></button>
            </div>
            
            <div className="p-10 space-y-10 overflow-y-auto">
              {discoveryStatus === 'waiting' ? (
                  <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-500">
                      <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2rem] flex gap-5">
                        <Cable className="text-blue-600 shrink-0" size={32} />
                        <div className="space-y-2">
                          <h4 className="text-base font-black text-blue-900 uppercase tracking-tight">Service Topology Ready</h4>
                          <p className="text-sm text-blue-800 leading-relaxed font-medium">
                            Uplink your internet source to <strong>Ether1</strong>. 
                            Our configuration will auto-bridge Ether2, Ether3, Ether4, and SFP ports for your clients.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Provisioning Command</label>
                        <div className="bg-[#0f172a] rounded-3xl p-8 font-mono text-[11px] text-blue-400 break-all relative group shadow-2xl border border-white/5 leading-relaxed">
                            {loaderCommand}
                            <button onClick={() => navigator.clipboard.writeText(loaderCommand)} className="absolute right-4 top-4 p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all">
                              <Copy size={22} />
                            </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-6 py-10 border-4 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-25"></div>
                          <div className="relative bg-blue-600 p-5 rounded-full text-white shadow-xl shadow-blue-600/30">
                            <RefreshCw size={32} className="animate-spin" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Listening for Node Pulse</p>
                          <p className="text-sm font-bold text-slate-600 mt-2">Paste the script in MikroTik Terminal to finish handshake.</p>
                        </div>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-10 animate-in zoom-in-95 duration-500">
                      <div className="p-8 bg-green-50 border border-green-100 rounded-[2rem] flex gap-5">
                        <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg">
                           <ShieldCheck size={28} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-green-900 uppercase tracking-tight">Identity Verified</h4>
                          <p className="text-sm text-green-800 font-medium leading-relaxed">Hardware detected at <strong>{discoveredInfo.host}</strong>. Provisioning bridge and security locks now.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Node Display Name</label>
                          <div className="relative">
                            <Network className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.name} onChange={(e) => setNewRouter({...newRouter, name: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">API Binary Port</label>
                          <div className="relative">
                            <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.port} onChange={(e) => setNewRouter({...newRouter, port: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Management User</label>
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.username} onChange={(e) => setNewRouter({...newRouter, username: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Auth Credential</label>
                          <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="password" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold focus:border-blue-600 outline-none transition-all" value={newRouter.password} onChange={(e) => setNewRouter({...newRouter, password: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleFinalizeNaming} 
                        disabled={actionLoading === 'provision'}
                        className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                      >
                        {actionLoading === 'provision' ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                        Deploy Node to Cloud Registry
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
