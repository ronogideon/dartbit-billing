
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
  WifiOff
} from 'lucide-react';
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
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatSpeed = (bps: number) => {
  if (!bps) return '0 kbps';
  if (bps < 1000000) return (bps / 1000).toFixed(1) + ' kbps';
  return (bps / 1000000).toFixed(2) + ' Mbps';
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
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const [counts, setCounts] = useState({ ALL: 0, PPPOE: 0, HOTSPOT: 0, ONLINE: 0 });

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [fetchedClients, fetchedSessions, fetchedPlans] = await Promise.all([
        mikrotikService.getClients(),
        mikrotikService.getActiveSessions(),
        mikrotikService.getPlans()
      ]);
      
      setActiveSessions(fetchedSessions);
      
      // Combine Client Database with Live Sessions
      const processedClients = fetchedClients.map(client => {
        const session = fetchedSessions.find(s => s.username === client.username);
        return {
          ...client,
          isOnline: !!session,
          downloadRate: session?.downloadRate || 0,
          uploadRate: session?.uploadRate || 0,
          uptime: session?.uptime || null,
          downloadBytes: session?.downloadBytes || (client.bandwidthUsage * 1024 * 1024 * 1024),
          uploadBytes: session?.uploadBytes || 0
        };
      });

      let finalDisplay;
      if (realtimeOnly) {
        // For Live Sessions tab, we show anyone currently authenticated
        finalDisplay = processedClients.filter(c => c.isOnline);
      } else {
        // For All Clients tab, we show everyone and filter by billing status if requested
        finalDisplay = filterStatus ? processedClients.filter(c => c.status === filterStatus) : processedClients;
      }

      setClients(finalDisplay);
      
      setCounts({
        ALL: finalDisplay.length,
        PPPOE: finalDisplay.filter(c => c.connectionType === ConnectionType.PPPOE).length,
        HOTSPOT: finalDisplay.filter(c => c.connectionType === ConnectionType.HOTSPOT).length,
        ONLINE: processedClients.filter(c => c.isOnline).length
      });
      
      const availablePlans = fetchedPlans.length > 0 ? fetchedPlans : BILLING_PLANS;
      setPlans(availablePlans);
    } catch (e) {
      console.error("Data sync failed", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 5000); 
    
    const closeMenu = () => setActiveMenuId(null);
    window.addEventListener('click', closeMenu);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', closeMenu);
    };
  }, [realtimeOnly, filterStatus]);

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
        password: '***',
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
        planId: plans.find(p => p.type === ConnectionType.PPPOE)?.id || plans[0]?.id || '',
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
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      connectionType: formData.connectionType,
      planId: formData.planId,
      status: ClientStatus.ACTIVE,
      balance: 0,
      expiryDate: formData.expiryDate.split('T')[0],
      bandwidthUsage: 0,
      address: formData.address
    };
    
    try {
      await mikrotikService.saveClient(clientPayload);
      await loadData();
      setShowModal(false);
    } catch (err) {
      alert("Failed to save client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.phone.includes(searchTerm);
    const matchesCategory = categoryFilter === 'ALL' || c.connectionType === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalCurrentDownSpeed = activeSessions.reduce((acc, s) => acc + (s.downloadRate || 0), 0);
  const totalCurrentUpSpeed = activeSessions.reduce((acc, s) => acc + (s.uploadRate || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
             {realtimeOnly ? (
               <div className="relative">
                 <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-25"></div>
                 <CheckCircle2 size={24} className="text-green-600 relative" />
               </div>
             ) : (
               <Users size={24} className="text-blue-600" />
             )}
             <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">
             {realtimeOnly ? 'Subscribers with currently authenticated hardware sessions.' : description || `Managing ${clients.length} accounts in the dartbit directory.`}
          </p>
        </div>
        {!realtimeOnly && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <button 
              onClick={() => handleOpenModal()} 
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={18} /> Register Subscriber
            </button>
          </div>
        )}
      </header>

      <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
        {[
          { id: 'ALL', label: realtimeOnly ? 'Online Now' : 'All Accounts', icon: Monitor, count: realtimeOnly ? counts.ALL : counts.ALL },
          { id: ConnectionType.PPPOE, label: 'PPPoE', icon: Radio, count: counts.PPPOE },
          { id: ConnectionType.HOTSPOT, label: 'Hotspot', icon: Wifi, count: counts.HOTSPOT }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id as any)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl transition-all ${
              categoryFilter === cat.id 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <cat.icon size={16} />
            <span className="text-xs font-bold tracking-tight">{cat.label}</span>
            <div className={`px-2 py-0.5 rounded-lg border text-[10px] font-black min-w-[28px] ${
              categoryFilter === cat.id ? 'bg-white/20 border-white/40 text-white' : 'border-slate-200 text-blue-500'
            }`}>
              {cat.count}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden border-b-4 border-b-slate-100">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Establishing MikroTik Link...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <Activity size={48} className="text-slate-100 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No {realtimeOnly ? 'Online' : 'Matching'} Subscribers</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">No users currently match your selection criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subscriber</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Billing Status</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Connectivity</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Traffic</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm relative ${
                          client.isOnline ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {client.connectionType === ConnectionType.PPPOE ? <Radio size={18} /> : <Wifi size={18} />}
                          {client.isOnline && (
                             <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{client.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{client.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-blue-500" />
                        <span className="text-sm font-medium text-slate-700">{plans.find(p => p.id === client.planId)?.name || 'Standard'}</span>
                      </div>
                    </td>

                    <td className="px-8 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        client.status === ClientStatus.ACTIVE ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {client.status}
                      </div>
                    </td>

                    <td className="px-8 py-5">
                      {client.isOnline ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-green-600">
                            <Zap size={10} className="fill-green-600" /> Online
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={10} /> {client.uptime || 'just now'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-300">
                          <WifiOff size={10} /> Offline
                        </span>
                      )}
                    </td>

                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                            <ArrowDown size={10} />
                            {formatBytes(client.downloadBytes)}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-600">
                            <ArrowUp size={10} />
                            {formatBytes(client.uploadBytes)}
                          </div>
                        </div>
                        {client.isOnline && (
                          <div className="flex gap-2">
                             <span className="text-[9px] font-bold text-slate-500">Live: {formatSpeed(client.downloadRate)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === client.id ? null : client.id); }}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {activeMenuId === client.id && (
                        <div className="absolute right-8 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-200 text-left">
                           <button onClick={() => handleOpenModal(client)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600">
                             <Edit2 size={14} /> Inspect Account
                           </button>
                           {client.isOnline && (
                             <>
                               <div className="h-px bg-slate-50 mx-2 my-1"></div>
                               <button onClick={() => {}} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50">
                                 <Activity size={14} /> Terminate Session
                               </button>
                             </>
                           )}
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

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="px-6 py-3 bg-slate-900 text-white rounded-2xl flex items-center gap-6 shadow-2xl border border-white/10 backdrop-blur-md">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Aggregate Down</span>
                 <span className="text-sm font-black text-blue-400">{formatSpeed(totalCurrentDownSpeed)}</span>
              </div>
           </div>
           <div className="w-px h-8 bg-white/10"></div>
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Aggregate Up</span>
                 <span className="text-sm font-black text-green-400">{formatSpeed(totalCurrentUpSpeed)}</span>
              </div>
           </div>
           <div className="w-px h-8 bg-white/10"></div>
           <div className="flex items-center gap-3">
              <div className="p-1.5 bg-green-600 rounded-lg">
                 <Zap size={14} className="text-white" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Presence</span>
                 <span className="text-sm font-black text-white">{counts.ONLINE} Online</span>
              </div>
           </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                  {editingClientId ? <Edit2 size={20} /> : <Plus size={20} />}
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{editingClientId ? 'Update Subscriber' : 'Provision Subscriber'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-10 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="col-span-full space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Connection Type</label>
                  <div className="flex gap-4">
                    {[ConnectionType.PPPOE, ConnectionType.HOTSPOT].map(type => (
                      <button 
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, connectionType: type})}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          formData.connectionType === type ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {type === ConnectionType.PPPOE ? <Radio size={18} /> : <Wifi size={18} />}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">First Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Username</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required type={showPassword ? "text" : "password"} className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                      <Eye size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Service Package</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none" value={formData.planId} onChange={(e) => setFormData({...formData, planId: e.target.value})}>
                      {plans.filter(p => p.type === formData.connectionType).map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name} - {plan.speedLimit}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="email" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="user@provider.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
                  {isSubmitting ? "Syncing with Nodes..." : editingClientId ? "Save Subscriber Changes" : "Activate Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;
