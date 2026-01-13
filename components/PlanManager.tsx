
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  Edit2, 
  Trash2, 
  Clock, 
  Zap, 
  Loader2,
  X,
  Radio,
  Wifi,
  ArrowUp,
  ArrowDown,
  Banknote,
  Activity,
  Package
} from 'lucide-react';
import { generatePlanSuggestion } from '../services/geminiService.ts';
import { ConnectionType, BillingPlan } from '../types.ts';
import { mikrotikService } from '../services/mikrotikService.ts';

const VALIDITY_OPTIONS = [
  { label: '1 Minute', minutes: 1 },
  { label: '3 Minutes', minutes: 3 },
  { label: '5 Minutes', minutes: 5 },
  { label: '10 Minutes', minutes: 10 },
  { label: '15 Minutes', minutes: 15 },
  { label: '30 Minutes', minutes: 30 },
  { label: '45 Minutes', minutes: 45 },
  { label: '1 Hour', minutes: 60 },
  { label: '2 Hours', minutes: 120 },
  { label: '3 Hours', minutes: 180 },
  { label: '4 Hours', minutes: 240 },
  { label: '5 Hours', minutes: 300 },
  { label: '6 Hours', minutes: 360 },
  { label: '12 Hours', minutes: 720 },
  { label: '24 Hours', minutes: 1440 },
  { label: '1 Day', minutes: 1440 },
  { label: '2 Days', minutes: 2880 },
  { label: '3 Days', minutes: 4320 },
  { label: '4 Days', minutes: 5760 },
  { label: '5 Days', minutes: 7200 },
  { label: '6 Days', minutes: 8640 },
  { label: '7 Days / 1 Week', minutes: 10080 },
  { label: '2 Weeks', minutes: 20160 },
  { label: '1 Month', minutes: 43200 },
  { label: '2 Months', minutes: 86400 },
  { label: '3 Months', minutes: 129600 },
  { label: '6 Months', minutes: 259200 },
  { label: '1 Year', minutes: 525600 },
];

const PlanManager: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  
  const [newPlan, setNewPlan] = useState({
    name: '',
    type: ConnectionType.PPPOE,
    upload: '5',
    download: '10',
    price: '2500',
    validityMinutes: '43200',
    description: ''
  });

  const loadPlans = async () => {
    setLoading(true);
    const fetched = await mikrotikService.getPlans();
    setPlans(fetched);
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenModal = (plan?: BillingPlan) => {
    if (plan) {
      const [up, down] = (plan.speedLimit || '5M/10M').replace(/M/g, '').split('/');
      setEditingPlanId(plan.id);
      setNewPlan({
        name: plan.name,
        type: plan.type,
        upload: up,
        download: down,
        price: String(plan.price),
        validityMinutes: String(plan.durationMinutes),
        description: plan.description
      });
    } else {
      setEditingPlanId(null);
      setNewPlan({
        name: '',
        type: ConnectionType.PPPOE,
        upload: '5',
        download: '10',
        price: '2500',
        validityMinutes: '43200',
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(newPlan.validityMinutes);
    const validityLabel = VALIDITY_OPTIONS.find(o => o.minutes === mins)?.label || `${mins} mins`;
    
    const planToAdd: BillingPlan = {
      id: editingPlanId || String(Date.now()),
      name: newPlan.name,
      type: newPlan.type,
      speedLimit: `${newPlan.upload}M/${newPlan.download}M`,
      price: Number(newPlan.price),
      validityDisplay: validityLabel,
      durationMinutes: mins,
      description: newPlan.description || `${newPlan.name}: ${newPlan.download}Mbps ${newPlan.type} Package`
    };
    
    await mikrotikService.savePlan(planToAdd);
    await loadPlans();
    setShowModal(false);
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service package?")) return;
    await mikrotikService.deletePlan(id);
    await loadPlans();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ISP Service Packages</h1>
          <p className="text-slate-500 text-sm font-medium italic">Define speed limits, pricing, and access duration for your network.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          <Plus size={20} /> Create New Package
        </button>
      </header>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Catalog...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
            <Package size={48} className="text-slate-100 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Service Packages</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">Create a billing plan to start offering internet services.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl ${plan.type === ConnectionType.HOTSPOT ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {plan.type === ConnectionType.HOTSPOT ? <Wifi size={28} /> : <Radio size={28} />}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pricing</p>
                    <p className="text-xl font-black text-slate-900">Ksh {plan.price.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1 mb-8">
                <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{plan.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                   {plan.type === ConnectionType.HOTSPOT ? 'Hotspot Captive Portal' : 'PPPoE Digital Subscriber Line'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <ArrowDown size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Download</span>
                    </div>
                    <p className="text-lg font-black text-slate-900">{plan.speedLimit.split('/')[1] || plan.speedLimit}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <ArrowUp size={14} className="text-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                    </div>
                    <p className="text-lg font-black text-slate-900">{plan.speedLimit.split('/')[0] || plan.speedLimit}</p>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                    <Clock size={16} className="text-blue-400" />
                    {plan.validityDisplay}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenModal(plan)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeletePlan(plan.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                        <Zap size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingPlanId ? 'Edit Package' : 'Create Package'}</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
            </div>

            <form onSubmit={handleSavePlan} className="p-10 space-y-8 overflow-y-auto">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Identity & Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" 
                      placeholder="Package Name (e.g. Lite)" 
                      value={newPlan.name} 
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})} 
                    />
                    <select 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all"
                      value={newPlan.type}
                      onChange={(e) => setNewPlan({...newPlan, type: e.target.value as ConnectionType})}
                    >
                        <option value={ConnectionType.PPPOE}>PPPoE</option>
                        <option value={ConnectionType.HOTSPOT}>Hotspot</option>
                    </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Bandwidth Limits (Mbps)</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <ArrowDown className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                        <input required type="number" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" placeholder="Down" value={newPlan.download} onChange={(e) => setNewPlan({...newPlan, download: e.target.value})} />
                    </div>
                    <div className="relative">
                        <ArrowUp className="absolute left-5 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                        <input required type="number" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" placeholder="Up" value={newPlan.upload} onChange={(e) => setNewPlan({...newPlan, upload: e.target.value})} />
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Billing Price (Ksh)</label>
                    <div className="relative">
                        <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input required type="number" className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" placeholder="Amount" value={newPlan.price} onChange={(e) => setNewPlan({...newPlan, price: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Active Validity</label>
                    <div className="relative">
                        <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all"
                          value={newPlan.validityMinutes}
                          onChange={(e) => setNewPlan({...newPlan, validityMinutes: e.target.value})}
                        >
                            {VALIDITY_OPTIONS.map(o => (
                                <option key={o.minutes} value={o.minutes}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Internal Description</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" 
                    rows={2}
                    placeholder="Briefly describe this package..."
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  />
              </div>

              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 hover:bg-slate-800 transition-all mt-4">
                  {editingPlanId ? 'Update Service Plan' : 'Publish Service Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManager;
