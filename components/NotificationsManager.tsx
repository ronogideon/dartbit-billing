import React, { useState } from 'react';
import { 
  Send, 
  History, 
  Settings as SettingsIcon, 
  MessageSquare, 
  Mail, 
  Users, 
  ShieldCheck, 
  Smartphone, 
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Save,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { MOCK_CLIENTS } from '../constants';

const NotificationsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'settings'>('compose');
  const [target, setTarget] = useState<'all' | 'pppoe' | 'hotspot' | 'individual'>('all');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Provider Config State
  const [providerConfig, setProviderConfig] = useState({
    provider: 'africastalking',
    apiKey: '********************************',
    username: 'dartbit_admin',
    senderId: 'DARTBIT'
  });

  const handleSendMessage = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setMessage('');
      alert('Broadcast initialized! Messages are being queued.');
    }, 2000);
  };

  const history = [
    { id: 1, type: 'SMS', target: 'All Clients', status: 'Delivered', date: '2024-05-20 14:30', content: 'Dear customer, your subscription is due tomorrow...' },
    { id: 2, type: 'Email', target: 'jdoe_pppoe', status: 'Sent', date: '2024-05-19 09:15', content: 'Invoice INV-8821 has been generated...' },
    { id: 3, type: 'SMS', target: 'Suspended Clients', status: 'Failed', date: '2024-05-18 16:45', content: 'Service suspended due to non-payment...' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Notifications Center</h1>
        <p className="text-slate-500">Manage SMS alerts, email automation, and provider integrations.</p>
      </header>

      {/* Internal Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('compose')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'compose' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Send size={16} /> Compose Broadcast
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History size={16} /> Sent History
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <SettingsIcon size={16} /> Provider Gateway
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {activeTab === 'compose' && (
          <>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700 block">Select Audience</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['all', 'pppoe', 'hotspot', 'individual'].map((opt) => (
                      <button 
                        key={opt}
                        onClick={() => setTarget(opt as any)}
                        className={`py-3 px-4 rounded-xl border-2 text-xs font-bold uppercase transition-all flex flex-col items-center gap-2 ${target === opt ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                      >
                        {opt === 'all' && <Users size={18} />}
                        {opt === 'pppoe' && <Smartphone size={18} />}
                        {opt === 'hotspot' && <Bell size={18} />}
                        {opt === 'individual' && <CheckCircle2 size={18} />}
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-700">Message Content</label>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">160 Characters = 1 SMS</span>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder="Hello {name}, your dartbit subscription is about to expire..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {['{name}', '{username}', '{balance}', '{expiry}'].map(tag => (
                      <button key={tag} className="px-3 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600 hover:bg-slate-200">
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-medium">Send via SMS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-medium">Send via Email</span>
                    </label>
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={!message || isSending}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Send Broadcast
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <MessageSquare className="text-blue-400" size={20} /> SMS Balance
                  </h3>
                  <div className="space-y-1">
                    <p className="text-3xl font-black">12,482</p>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Available Credits</p>
                  </div>
                  <div className="pt-4">
                    <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors">
                      Top Up Credits
                    </button>
                  </div>
                </div>
                <div className="absolute top-[-20%] right-[-10%] opacity-10">
                  <MessageSquare size={120} />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" /> Templates
                </h3>
                <div className="space-y-3">
                  {['Welcome Message', 'Due Reminder', 'Payment Receipt', 'Overdue Alert'].map((t, i) => (
                    <button key={i} className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-700 flex justify-between items-center group">
                      {t}
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-900">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target Audience</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Message Snippet</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {h.type === 'SMS' ? <Smartphone size={14} className="text-slate-400" /> : <Mail size={14} className="text-slate-400" />}
                        {h.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{h.target}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{h.content}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{h.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        h.status === 'Delivered' || h.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">SMS Gateway Config</h3>
                  <p className="text-sm text-slate-500">Configure your Africa's Talking or BulkSMS API credentials.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Gateway Provider</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    value={providerConfig.provider}
                    onChange={(e) => setProviderConfig({...providerConfig, provider: e.target.value})}
                  >
                    <option value="africastalking">Africa's Talking (Kenya)</option>
                    <option value="advantasms">Advanta SMS</option>
                    <option value="twilio">Twilio Global</option>
                    <option value="mobilesasa">Mobile Sasa</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Sender ID / Alphanumeric</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    value={providerConfig.senderId}
                    onChange={(e) => setProviderConfig({...providerConfig, senderId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest">API Username</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    value={providerConfig.username}
                    onChange={(e) => setProviderConfig({...providerConfig, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest">API Key / Token</label>
                  <input 
                    type="password" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    value={providerConfig.apiKey}
                    onChange={(e) => setProviderConfig({...providerConfig, apiKey: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                <AlertTriangle className="text-blue-600 mt-0.5" size={18} />
                <div className="text-xs text-blue-700 leading-relaxed font-medium">
                  Ensure you have sufficient balance in your provider's account. Webhooks for delivery reports can be configured in the Advanced Settings tab.
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg">
                  <Save size={18} /> Save Credentials
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationsManager;