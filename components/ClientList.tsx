
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Activity, 
  Users, 
  Wifi, 
  Radio, 
  Plus, 
  X, 
  User, 
  Smartphone, 
  ShieldCheck, 
  Calendar, 
  Package, 
  Loader2, 
  Mail, 
  Key, 
  Eye, 
  Clock,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  Monitor,
  Zap,
  CheckCircle2,
  WifiOff,
  History,
  TrendingUp,
  ChevronRight,
  Database,
  Timer,
  Filter
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { BILLING_PLANS } from '../constants.ts';
import { ClientStatus, ConnectionType, Client, BillingPlan } from '../types.ts';
import { mikrotikService } from '../services/mikrotikService.ts';

interface ClientListProps {
  filterStatus?: ClientStatus;
  title?: string;
  description?: string;
  realtimeOnly?: boolean;
}

const formatBytes = (bytes: number) => {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
};

const formatSpeed = (bps: number) => {
  if (!bps || isNaN(bps)) return '0 kbps';
  if (bps < 1000) return bps.toFixed(0) + ' bps';
  if (bps < 1000000) return (bps / 1000).toFixed(0) + ' kbps';
  return (bps / 1000000).toFixed(1) + ' Mbps';
};

const ClientList: React.FC<ClientListProps> = ({ 
  filterStatus, 
  title = "Network Subscribers", 
  description,
  realtimeOnly = false
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>(BILLING_PLANS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ConnectionType>('ALL');
  
  const [showModal, setShowModal] = useState(false);
  const [inspectingClient, setInspectingClient] = useState<any | null>(null);
  
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    connectionType: ConnectionType.PPPOE,
    username: '',
    password: '',
    planId: '',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    address: ''
  });

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [fetchedClients, fetchedSessions, fetchedPlans] = await Promise.all([
        mikrotikService.getClients(),
        mikrotikService.getActiveSessions(),
        mikrotikService.getPlans()
      ]);
      
      setActiveSessions(fetchedSessions);
      
      const processedClients = fetchedClients.map(client => {
        const session = fetchedSessions.find(s => s.username === client.username);
        return {
          ...client,
          isOnline: !!session,
          downloadRate: session?.downloadRate || 0,
          uploadRate: session?.uploadRate || 0,
          uptime: session?.uptime || null,
          totalDownload: session?.totalDownload || 0,
          totalUpload: session?.totalUpload || 0,
        };
      });

      setClients(processedClients);
      setPlans(fetchedPlans.length > 0 ? fetchedPlans : BILLING_PLANS);
    } catch (e) {} finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 3000); 
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleOpenModal = (client?: any) => {
    if (client) {
      const names = client.fullName.split(' ');
      setEditingClientId(client.id);
      setFormData({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        phone: client.phone,
        email: client.email,
        connectionType: client.connectionType,
        username: client.username,
        password: client.password || '',
        planId: client.planId,
        expiryDate: new Date(client.expiryDate).toISOString().slice(0, 16),
        address: client.address
      });
    } else {
      setEditingClientId(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        connectionType: ConnectionType.PPPOE,
        username: '',
        password: '',
        planId: plans[0]?.id || '',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        address: ''
      });
    }
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const clientPayload: Client = {
      id: editingClientId || `c${Date.now()}`,
      username: formData.username,
      password: formData.password,
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      connectionType: formData.connectionType,
      planId: formData.planId,
      status: ClientStatus.ACTIVE,
      balance: 0,
      expiryDate: formData.expiryDate,
      bandwidthUsage: 0,
      address: formData.address
    };
    try {
      await mikrotikService.saveClient(clientPayload);
      await loadData();
      setShowModal(false);
    } catch (err) {} finally { setIsSubmitting(false); }
  };

  const handleDeleteSubscriber = async (id: string, name: string) => {
    if (!confirm(`Permanently remove ${name} from the directory?`)) return;
    try {
      await mikrotikService.deleteClient(id);
      await loadData();
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.username.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesCategory = true;
    if (categoryFilter === ConnectionType.PPPOE) matchesCategory = c.connectionType === ConnectionType.PPPOE;
    else if (categoryFilter === ConnectionType.HOTSPOT) matchesCategory = c.connectionType === ConnectionType.HOTSPOT;
    return matchesSearch && matchesCategory;
  });

  const aggregateDown = clients.reduce((acc, c) => acc + (c.downloadRate || 0), 0);
  const aggregateUp = clients.reduce((acc, c) => acc + (c.uploadRate || 0), 0);
  const liveCount = clients.filter(c => c.isOnline).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <Users size={28} className="text-blue-600" />
             <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          </div>
          <p className="text-slate-600 text-sm font-medium mt-1">
             Managing {clients.length} accounts in the dartbit directory.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search..." className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm w-full sm:w-72 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm transition-all text-slate-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
            <Plus size={20} /> Register Subscriber
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 p-1.5 bg-white border border-slate-200 rounded-3xl w-fit shadow-sm">
        <button 
          onClick={() => setCategoryFilter('ALL')} 
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-bold transition-all ${categoryFilter === 'ALL' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Monitor size={16} /> All Accounts
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ml-1 ${categoryFilter === 'ALL' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{clients.length}</span>
        </button>
        <button 
          onClick={() => setCategoryFilter(ConnectionType.PPPOE)} 
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-bold transition-all ${categoryFilter === ConnectionType.PPPOE ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Radio size={16} /> PPPoE
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ml-1 ${categoryFilter === ConnectionType.PPPOE ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{clients.filter(c => c.connectionType === ConnectionType.PPPOE).length}</span>
        </button>
        <button 
          onClick={() => setCategoryFilter(ConnectionType.HOTSPOT)} 
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-bold transition-all ${categoryFilter === ConnectionType.HOTSPOT ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Wifi size={16} /> Hotspot
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ml-1 ${categoryFilter === ConnectionType.HOTSPOT ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{clients.filter(c => c.connectionType === ConnectionType.HOTSPOT).length}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[11px] font-black text-slate-600 uppercase tracking-[0.15em]">
                <th className="px-10 py-6">Subscriber</th>
                <th className="px-10 py-6">Plan</th>
                <th className="px-10 py-6">Billing Status</th>
                <th className="px-10 py-6">Connectivity</th>
                <th className="px-10 py-6">Traffic</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClients.map((client) => (
                <tr key={client.id} onClick={() => setInspectingClient(client)} className="hover:bg-slate-50/50 cursor-pointer transition-colors group">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                        {client.connectionType === ConnectionType.PPPOE ? <Monitor size={20} /> : <Wifi size={20} />}
                      </div>
                      <div>
                        <div className="text-base font-bold text-slate-900">{client.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-black uppercase tracking-widest">{client.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="text-blue-600"><Package size={20} /></div>
                      <span className="text-sm font-bold">
                        {plans.find(p => p.id === client.planId)?.name || 'Standard Plan'}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                       {client.status}
                    </span>
                  </td>
                  <td className="px-10 py-7">
                    {client.isOnline ? (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-green-600">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        CONNECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
                        <WifiOff size={16} /> OFFLINE
                      </span>
                    )}
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                        <ArrowDown size={14} /> {formatBytes(client.totalDownload || 0)}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-green-700">
                        <ArrowUp size={14} /> {formatBytes(client.totalUpload || 0)}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right relative">
                     <button 
                       onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === client.id ? null : client.id); }}
                       className="p-2 text-slate-400 group-hover:text-slate-900 transition-colors"
                     >
                        <MoreVertical size={20} />
                     </button>
                     {activeMenuId === client.id && (
                       <div className="absolute right-12 top-1/2 -translate-y-1/2 z-[200] bg-white border border-slate-200 rounded-xl shadow-2xl py-1 w-44 animate-in zoom-in-95 overflow-hidden">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit2 size={14} className="text-blue-600" /> Modify
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSubscriber(client.id, client.fullName); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} /> Delete Subscriber
                          </button>
                       </div>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-8 px-10 py-5 bg-[#0f172a] text-white rounded-[2rem] shadow-2xl border border-white/5 animate-in slide-in-from-bottom-8 duration-500">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aggregate Down</span>
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                 </div>
                 <span className="text-lg font-black">{formatSpeed(aggregateDown)}</span>
              </div>
           </div>
           <div className="w-px h-10 bg-white/10"></div>
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aggregate Up</span>
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 </div>
                 <span className="text-lg font-black">{formatSpeed(aggregateUp)}</span>
              </div>
           </div>
           <div className="w-px h-10 bg-white/10"></div>
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Presence</span>
              <div className="flex items-center gap-3">
                 <div className="bg-green-500 text-white p-1 rounded-lg">
                    <Zap size={14} fill="currentColor" />
                 </div>
                 <span className="text-lg font-black">{liveCount} Online</span>
              </div>
           </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                  <User size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingClientId ? 'Modify Subscriber' : 'Register Subscriber'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-10 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 block">Connection Topology</label>
                  <div className="flex gap-4">
                    {[ConnectionType.PPPOE, ConnectionType.HOTSPOT].map(type => (
                      <button 
                        key={type} type="button" 
                        onClick={() => setFormData({...formData, connectionType: type})}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          formData.connectionType === type ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {type === ConnectionType.PPPOE ? <Monitor size={18} /> : <Wifi size={18} />}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">First Name</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 outline-none" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="e.g. Daniel" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Last Name</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 outline-none" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="e.g. Kimani" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Network Username</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 outline-none" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="e.g. DKimani" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Password</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 outline-none" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Service Plan</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 outline-none" value={formData.planId} onChange={(e) => setFormData({...formData, planId: e.target.value})}>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.speedLimit})</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-600/10 active:scale-95 transition-all flex items-center justify-center gap-3">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                {editingClientId ? 'Update Config' : 'Register Subscriber'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;
