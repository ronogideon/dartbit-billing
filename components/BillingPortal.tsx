
import React, { useState } from 'react';
import { 
  CreditCard, 
  History, 
  Smartphone, 
  ShieldCheck, 
  Globe, 
  LogOut,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { BILLING_PLANS } from '../constants';

const BillingPortal: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const user = {
    name: "John Doe",
    username: "jdoe_pppoe",
    status: "Active",
    expiry: "2024-12-31"
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white selection:bg-blue-500/30">
      <nav className="max-w-5xl mx-auto p-6 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">NP</div>
          <span className="font-bold text-lg tracking-tight">NetPulse Portal</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500">Welcome back</span>
            <span className="text-sm font-bold">{user.name}</span>
          </div>
          <button className="p-2 text-slate-500 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/20 relative overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-1">
                    <p className="text-blue-100 text-sm font-medium opacity-80 uppercase tracking-widest">Active Plan</p>
                    <h2 className="text-3xl font-bold">Standard 10Mbps</h2>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {user.status}
                  </div>
                </div>
                <div className="mt-auto flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-blue-100 text-xs opacity-70">Expiry Date</p>
                    <p className="font-bold text-xl">{user.expiry}</p>
                  </div>
                  <button className="bg-white text-blue-700 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-lg">
                    Renew Now
                  </button>
                </div>
              </div>
              <div className="absolute top-[-20%] right-[-10%] opacity-10">
                <Globe size={300} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold px-2 text-slate-200">Renew Subscription</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BILLING_PLANS.slice(0, 4).map((plan) => (
                  <button 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-6 rounded-2xl text-left border-2 transition-all ${
                      selectedPlan === plan.id 
                        ? 'border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10' 
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-lg font-bold">{plan.name}</span>
                      <span className="font-bold text-blue-400">Ksh {plan.price.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-6">{plan.description}</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span>{plan.speedLimit}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                      {/* Fixed: Calculate days from durationMinutes because durationDays doesn't exist on BillingPlan */}
                      <span>{plan.durationMinutes / 1440} Days</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
              <h3 className="font-bold text-lg">Checkout with M-Pesa</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-[#49c51c] text-slate-900 rounded-2xl font-bold hover:opacity-90 transition-opacity">
                  <span className="flex items-center gap-3">
                    <ShieldCheck size={20} /> Pay with M-Pesa
                  </span>
                  <ChevronRight size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest px-4 leading-relaxed">
                Instant activation upon M-Pesa confirmation
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Recent Invoices</h3>
                <History size={16} className="text-slate-500" />
              </div>
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                  <div>
                    <p className="text-sm font-bold">INV-842{i}</p>
                    <p className="text-xs text-slate-500">Dec 01, 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">Ksh 2,500</p>
                    <span className="text-[10px] text-green-500 font-bold uppercase">Paid</span>
                  </div>
                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={14} className="text-blue-500" />
                  </div>
                </div>
              ))}
              <button className="w-full text-xs font-bold text-slate-500 hover:text-white transition-colors pt-2">
                View All History
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BillingPortal;
