
import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Smartphone, 
  Clock, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Ticket,
  Lock
} from 'lucide-react';
import { BILLING_PLANS } from '../constants';

const HotspotLanding: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<'main' | 'payment' | 'processing' | 'success'>('main');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [timer, setTimer] = useState(3);
  const [isVoucherLoading, setIsVoucherLoading] = useState(false);

  // Fixed: Calculate days from durationMinutes since durationDays is not a property of BillingPlan
  const hotspotPlans = BILLING_PLANS.filter(p => (p.durationMinutes / 1440) <= 7);

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handleVoucherLogin = () => {
    if (!voucherCode) return;
    setIsVoucherLoading(true);
    setTimeout(() => {
      setIsVoucherLoading(false);
      setStep('success');
    }, 1500);
  };

  const handlePayment = () => {
    if (!phoneNumber) return;
    setStep('processing');
  };

  useEffect(() => {
    if (step === 'processing') {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStep('success');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center">
      {/* Status Bar Simulation */}
      <div className="w-full max-w-md bg-white px-6 py-3 flex justify-between items-center border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
          <span>9:41</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-blue-600" />
          <div className="w-4 h-2 bg-slate-200 rounded-sm overflow-hidden">
            <div className="w-3/4 h-full bg-slate-400"></div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md flex-1 bg-white shadow-2xl shadow-slate-200/50 flex flex-col overflow-hidden">
        
        {/* Navigation Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
          {step === 'payment' ? (
            <button onClick={() => setStep('main')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-8"></div>
          )}
          <div className="flex-1 text-center font-bold text-slate-900 text-sm tracking-tight flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white">
              <Zap size={14} />
            </div>
            NetPulse Hotspot
          </div>
          <button onClick={onBack} className="text-blue-600 text-xs font-bold hover:underline">Exit</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'main' && (
            <div className="animate-in fade-in duration-500 pb-10">
              {/* Branding Header */}
              <div className="bg-slate-900 text-white p-8 space-y-2 relative overflow-hidden">
                <h1 className="text-2xl font-black relative z-10">Get Connected</h1>
                <p className="text-slate-400 text-sm relative z-10">Instant WiFi in the Kenya Region.</p>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wifi size={120} />
                </div>
              </div>

              {/* Voucher Sign In Section */}
              <section className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest">
                  <Ticket size={14} />
                  Already have a voucher?
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Enter Voucher Code"
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleVoucherLogin}
                    disabled={!voucherCode || isVoucherLoading}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isVoucherLoading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
                    Login to Network
                  </button>
                </div>
              </section>

              <div className="px-6">
                <div className="h-px bg-slate-100 w-full"></div>
              </div>

              {/* Package Options Section */}
              <section className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900">Buy a Package</h2>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">M-Pesa Only</span>
                </div>

                <div className="space-y-4">
                  {hotspotPlans.map((plan) => (
                    <button 
                      key={plan.id}
                      onClick={() => handlePlanSelect(plan)}
                      className="w-full p-5 rounded-3xl border-2 border-slate-100 hover:border-blue-500 bg-white flex items-center gap-4 transition-all active:scale-98 text-left group shadow-sm hover:shadow-md"
                    >
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Clock size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{plan.name}</span>
                          <span className="font-black text-blue-600 text-lg">Ksh {plan.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1"><Zap size={12} /> {plan.speedLimit}</span>
                          <span>•</span>
                          {/* Fixed: Calculate days from durationMinutes because durationDays doesn't exist on BillingPlan */}
                          <span>{(plan.durationMinutes / 1440) === 1 ? '24 Hours' : (plan.durationMinutes / 1440) + ' Days'}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <Zap size={18} />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Unlimited</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <ShieldCheck size={18} />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Safe</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <Smartphone size={18} />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Direct</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 'payment' && (
            <div className="px-6 py-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">Checkout</h2>
                <p className="text-slate-500 text-sm text-center">Securing access for {selectedPlan?.name}</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 text-slate-900">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Selected Package</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900">{selectedPlan?.name}</span>
                  <span className="text-2xl font-black text-blue-600">Ksh {selectedPlan?.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-6 h-6 bg-[#49c51c] rounded-full flex items-center justify-center text-white">
                        <Smartphone size={14} />
                    </div>
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">M-Pesa Phone Number</label>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold">
                    +254
                  </div>
                  <input 
                    type="tel" 
                    placeholder="712 345 678"
                    className="w-full pl-16 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-[#49c51c] focus:ring-0 outline-none transition-all shadow-sm placeholder:text-slate-300"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 px-2 leading-relaxed italic text-center">
                  An STK Push will be sent to your phone. Enter your M-Pesa PIN on your phone to complete.
                </p>
              </div>

              <button 
                onClick={handlePayment}
                disabled={!phoneNumber}
                className="w-full py-4 bg-[#49c51c] text-white rounded-2xl font-black text-lg shadow-lg shadow-green-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck size={20} /> Pay with M-Pesa
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="px-8 py-24 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Smartphone size={32} className="text-blue-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Confirming Payment...</h3>
                <p className="text-slate-500 text-sm">Please check your phone for the M-Pesa prompt.</p>
              </div>
              <div className="w-full max-w-[200px] h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000 ease-linear" 
                  style={{ width: `${((3 - timer) / 3) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="px-8 py-16 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
                <CheckCircle2 size={56} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Connected!</h3>
                <p className="text-slate-500">Your high-speed access is now active.</p>
              </div>

              <div className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400 uppercase tracking-widest text-[10px]">Reference</span>
                  <span className="text-slate-900 font-mono">MPESA-{Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400 uppercase tracking-widest text-[10px]">Expiry</span>
                  <span className="text-blue-600 font-black">
                    {/* Fixed: Calculate days from durationMinutes since durationDays is not a property of BillingPlan */}
                    {selectedPlan ? ((selectedPlan.durationMinutes / 1440) === 1 ? '23h 59m' : (selectedPlan.durationMinutes / 1440) + ' Days') : 'Unlimited Access'}
                  </span>
                </div>
              </div>

              <button 
                onClick={onBack}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-6 text-center border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={12} /> Kenya M-Pesa Gateway • NetPulse v2.5
          </p>
        </div>
      </div>
    </div>
  );
};

export default HotspotLanding;
