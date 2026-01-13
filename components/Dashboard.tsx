
import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Users, 
  Banknote, 
  Activity, 
  AlertCircle,
  TrendingUp,
  Brain,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { REVENUE_DATA } from '../constants.ts';
import { getNetworkInsights } from '../services/geminiService.ts';
import { mikrotikService } from '../services/mikrotikService.ts';

const Dashboard: React.FC = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalClients: 0,
    activeSessions: 0,
    revenue: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [clients, sessions, plans] = await Promise.all([
        mikrotikService.getClients(),
        mikrotikService.getActiveSessions(),
        mikrotikService.getPlans()
      ]);
      
      const totalRevenue = clients.reduce((acc, c) => {
        const plan = plans.find(p => p.id === c.planId);
        return acc + (plan ? plan.price : 0);
      }, 0);

      setDashboardData({
        totalClients: clients.length,
        activeSessions: sessions.length,
        revenue: totalRevenue,
        overdue: clients.filter(c => c.status === 'EXPIRED' || c.balance > 0).length
      });

      if (clients.length > 0 && insights.length === 0 && !loadingInsights) {
        setLoadingInsights(true);
        const aiInsights = await getNetworkInsights(clients, REVENUE_DATA);
        setInsights(aiInsights);
        setLoadingInsights(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Subscribers', value: dashboardData.totalClients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Current Revenue', value: `Ksh ${dashboardData.revenue.toLocaleString()}`, icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Live Sessions', value: dashboardData.activeSessions, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Attention Required', value: dashboardData.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Pulse</h1>
          <p className="text-slate-500 text-sm">Real-time performance and subscriber metrics.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-colors text-slate-600">
            Export Analytics
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-blue-100 group">
            <div className={`${stat.bg} p-3 rounded-xl transition-transform group-hover:scale-110`}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-2">
            <h2 className="font-bold text-slate-900">Subscription Growth</h2>
            <div className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full tracking-widest">Rolling 6 Months</div>
          </div>
          <div className="h-64 md:h-80">
            {dashboardData.totalClients === 0 ? (
               <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-2xl">
                 <TrendingUp size={32} className="opacity-20" />
                 <p className="text-xs font-bold uppercase tracking-widest">No growth data yet</p>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                    cursor={{stroke: '#3b82f6', strokeWidth: 2}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl text-white flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-600 rounded-lg">
                <Brain className="text-white" size={20} />
            </div>
            <h2 className="font-bold tracking-tight">AI Strategy Core</h2>
          </div>
          <div className="space-y-4 flex-1">
            {loadingInsights ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : insights.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
                  <Activity className="text-slate-700" size={48} />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-loose">Waiting for network telemetry to generate insights...</p>
               </div>
            ) : insights.map((item, i) => (
              <div key={i} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 hover:border-blue-500/50 transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-wide">{item.title}</h4>
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                    {item.impact}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{item.insight}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5">
             <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <span>Gemini Engine</span>
                <span className="text-green-500">Live</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
