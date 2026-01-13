
import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Plus, 
  Copy, 
  Zap, 
  X, 
  Trash2, 
  Loader2, 
  MoreHorizontal, 
  ShieldCheck, 
  RefreshCw, 
  Server, 
  ArrowUpDown, 
  Power,
  Clock,
  Cpu,
  Database
} from 'lucide-react';
import { mikrotikService } from '../services/mikrotikService.ts';
import { RouterStatus, RouterNode } from '../types.ts';

const MikroTikConfig: React.FC = () => {
  const [routers, setRouters] = useState<RouterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<'name' | 'waiting' | 'success'>('name');
  const [discoveredInfo, setDiscoveredInfo] = useState<any>(null);
  const [sortKey, setSortKey] = useState<keyof RouterNode>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [nodeName, setNodeName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRouters = async () => {
    if (routers.length === 0) setLoading(true);
    try {
      const fetched = await mikrotikService.getRouters();
      setRouters(fetched);
    } catch (err) {
      console.error("Telemetry Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRouters();
    const interval = setInterval(loadRouters, 4000);
    const handleClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleClick);
    return () => { clearInterval(interval); window.removeEventListener('click', handleClick); };
  }, []);

  const handleStartOnboarding = async () => {
    setNodeName('');
    setDiscoveryStatus('name');
    setIsProvisioning(true);
    await mikrotikService.clearDiscovery();
  };

  const handleBeginWaiting = () => {
    if (!nodeName) return;
    setDiscoveryStatus('waiting');
  };

  const pollIntervalRef = useRef<any>(null);
  useEffect(() => {
    if (isProvisioning && discoveryStatus === 'waiting') {
      pollIntervalRef.current = setInterval(async () => {
        const found = await mikrotikService.discoverRouters();
        if (found && found.length > 0) {
          const node = found[found.length - 1];
          setDiscoveredInfo(node);
          setDiscoveryStatus('success');
          clearInterval(pollIntervalRef.current);
          
          const newNode: RouterNode = {
            id: `r-${Date.now()}`,
            name: nodeName,
            host: node.host,
            username: 'dartbit',
            password: 'dartbit123',
            port: 8728,
            status: RouterStatus.ONLINE,
            cpu: 0, memory: 0, sessions: 0, uptime: '0s', lastSync: new Date().toLocaleString()
          };
          
          await mikrotikService.saveRouters([newNode, ...routers]);
          setTimeout(() => { setIsProvisioning(false); loadRouters(); }, 2000);
        }
      }, 2000);
    }
    return () => clearInterval(pollIntervalRef.current);
  }, [isProvisioning, discoveryStatus, nodeName, routers]);

  const handleReboot = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Reboot physical hardware? This will disconnect clients.")) return;
    setActionLoading(id);
    try {
      await mikrotikService.rebootRouter(id);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
      setActiveMenuId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Remove from platform registry?")) return;
    await mikrotikService.deleteRouter(id);
    loadRouters();
  };

  const sortedRouters = [...routers].sort((a, b) => {
    const valA = a[sortKey] || '';
    const valB = b[sortKey] || '';
    return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });

  const baseUrl = window.location.origin;
  const ztpCommand = `/tool fetch url="${baseUrl}/boot?ip=auto" dst-path=dartbit.rsc check-certificate=no; :delay 2s; /import dartbit.rsc`;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <Network className="text-blue-600" size={24} />
             <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Backbone</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Real-time hardware status and live telemetry.</p>
        </div>
        <button 
          onClick={handleStartOnboarding} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={18} /> Add Physical Node
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden">
        {loading && routers.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-xs font-black uppercase tracking-widest animate-pulse">Detecting Hardware...</p>
          </div>
        ) : routers.length === 0 ? (
          <div className="py-32 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
               <Network className="text-slate-200" size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Zero Connected Nodes</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">Use the provisioning wizard to bridge your MikroTik boards.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest cursor-pointer group" onClick={() => { setSortKey('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-2">Board Name <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest">Model / RouterOS</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">CPU/RAM</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center cursor-pointer group" onClick={() => { setSortKey('sessions'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center justify-center gap-2">Clients <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-700 uppercase tracking-widest">State</th>
                  <th className="px-10 py-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedRouters.map(router => (
                  <tr key={router.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${router.status === 'ONLINE' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                          <Server size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{router.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 font-bold tracking-tight">{router.host}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <p className="text-xs font-bold text-slate-800 uppercase">{router.model || 'Unknown'}</p>
                      <p className="text-[9px] font-black text-blue-600 uppercase">OS v{router.version || '0.0'}</p>
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex flex-col gap-2 max-w-[120px] mx-auto">
                        <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                          <span>CPU: {router.cpu}%</span>
                          <span>RAM: {router.memory}MB</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${router.cpu > 80 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${router.cpu}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-lg font-black text-slate-900">{router.sessions}</span>
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                      </div>
                    </td>
                    <td className="px-10 py-7">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${router.status === 'ONLINE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${router.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        {router.status}
                      </span>
                    </td>
                    <td className="px-10 py-7 text-right relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === router.id ? null : router.id); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                        <MoreHorizontal size={24} />
                      </button>
                      {activeMenuId === router.id && (
                        <div className="absolute right-10 top-16 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-1.5 animate-in zoom-in-95 overflow-hidden">
                          <button onClick={(e) => handleReboot(e, router.id)} className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-colors">
                             <Power size={16} className="text-blue-600" /> Reboot Hardware
                          </button>
                          <div className="h-px bg-slate-100 mx-2 my-1"></div>
                          <button onClick={(e) => handleDelete(e, router.id)} className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black uppercase text-red-600 hover:bg-red-50 transition-colors">
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
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-xl w-full overflow-hidden border border-white/20 flex flex-col">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-600/20"><Zap size={24} /></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">ZTP Wizard</h2>
              </div>
              <button onClick={() => setIsProvisioning(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={36} /></button>
            </div>

            <div className="p-10 space-y-8">
              {discoveryStatus === 'name' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Step 1: Board Alias</h3>
                    <p className="text-sm text-slate-500 font-medium">How should this MikroTik appear in your dashboard?</p>
                  </div>
                  <input autoFocus className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-xl outline-none focus:border-blue-600 transition-all text-center" placeholder="e.g. Core-Switch-HQ" value={nodeName} onChange={(e) => setNodeName(e.target.value)} />
                  <button onClick={handleBeginWaiting} disabled={!nodeName} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all">
                    Generate Provisioning Command
                  </button>
                </div>
              )}

              {discoveryStatus === 'waiting' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
                  <div className="bg-slate-900 rounded-[2rem] p-8 relative group border border-white/5 shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Master Provisioning Script</p>
                    <code className="block text-xs font-mono text-blue-400 break-all leading-loose">{ztpCommand}</code>
                    <button onClick={() => navigator.clipboard.writeText(ztpCommand)} className="absolute right-6 top-6 p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20"><Copy size={20} /></button>
                  </div>
                  <div className="flex flex-col items-center gap-6 py-10 border-4 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                    <RefreshCw className="animate-spin text-blue-600" size={40} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Awaiting Remote Handshake</p>
                  </div>
                </div>
              )}

              {discoveryStatus === 'success' && (
                <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 py-10">
                  <div className="mx-auto w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-xl">
                    <ShieldCheck size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900">Hardware Linked!</h3>
                  <p className="text-slate-500 text-sm font-medium">Provisioning script applied to <b>{nodeName}</b> successfully.</p>
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
