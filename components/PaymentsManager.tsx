
import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Smartphone,
  RefreshCcw,
  Network,
  Loader2
} from 'lucide-react';
import { Payment } from '../types.ts';
import { mikrotikService } from '../services/mikrotikService.ts';

const PaymentsManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchPayments = async () => {
    try {
      const data = await mikrotikService.getPayments();
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter(p => 
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayRevenue = filteredPayments
    .filter(p => p.status === 'SUCCESS' && new Date(p.date).toDateString() === new Date().toDateString())
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaction Ledger</h1>
          <p className="text-slate-500">Real-time M-Pesa payments and service automation logs.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search TXID or Client..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
            <Download size={18} /> Export
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Revenue</p>
            <h3 className="text-2xl font-black text-slate-900">Ksh {todayRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <ArrowUpRight size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pushes</p>
            <h3 className="text-2xl font-black text-slate-900">{filteredPayments.length}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Smartphone size={24} />
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between text-white">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Service Automations</p>
            <h3 className="text-2xl font-black text-blue-400">100%</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1">AUTO-RECONNECT ACTIVE</p>
          </div>
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
            <RefreshCcw size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Ledger...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center px-10">
            <Wallet size={48} className="text-slate-100 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Transactions Found</h3>
            <p className="text-slate-400 text-sm">Payments will appear here as soon as clients initiate STK pushes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan / Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">MikroTik Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm font-bold text-slate-900">{payment.transactionId}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">{payment.method} Gateway</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{payment.clientName}</div>
                      <div className="text-xs text-slate-500">ID: {payment.clientId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-slate-900">Ksh {payment.amount.toLocaleString()}</div>
                      <div className="text-xs text-blue-600 font-bold">{payment.planName} Package</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      ) : payment.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <XCircle size={12} /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'SUCCESS' ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                          <Network size={14} /> Reconnected
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <ShieldCheck size={14} /> No Action
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

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Zap size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Automation Logic Enabled</h4>
          <p className="text-xs text-blue-700 leading-relaxed mt-1">
            Clients are automatically reconnected via MikroTik API once an M-Pesa <strong>SUCCESS</strong> callback is received. 
            The system tracks the <code>durationMinutes</code> of the purchased plan and will schedule a disconnection task at 11:59 PM on the calculated <code>expiryDate</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentsManager;
