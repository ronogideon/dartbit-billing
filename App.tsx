
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import ClientList from './components/ClientList.tsx';
import PlanManager from './components/PlanManager.tsx';
import MikroTikConfig from './components/MikroTikConfig.tsx';
import BillingPortal from './components/BillingPortal.tsx';
import HotspotLanding from './components/HotspotLanding.tsx';
import NotificationsManager from './components/NotificationsManager.tsx';
import PaymentsManager from './components/PaymentsManager.tsx';
import { ClientStatus } from './types.ts';
import { mikrotikService } from './services/mikrotikService.ts';
import { Menu, Terminal, Search, Link2, Link2Off, Loader2, RefreshCcw } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'admin' | 'client' | 'hotspot'>('admin');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [checkingBridge, setCheckingBridge] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);

  const checkBridge = async () => {
    const isUp = await mikrotikService.checkHealth();
    setBridgeOnline(isUp);
    if (isUp) {
      setIsSimulated(false);
      mikrotikService.setSimulationMode(false);
    }
    setCheckingBridge(false);
  };

  useEffect(() => {
    checkBridge();
    const interval = setInterval(checkBridge, 10000); 
    return () => clearInterval(interval);
  }, []);

  if (viewMode === 'client') return <BillingPortal />;
  if (viewMode === 'hotspot') return <HotspotLanding onBack={() => setViewMode('admin')} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'clients': return <ClientList />;
      case 'active-clients': return (
        <ClientList 
          realtimeOnly={true} 
          title="Active Live Sessions" 
          description="Real-time authenticated clients fetched from access nodes." 
        />
      );
      case 'billing': return <PlanManager />;
      case 'payments': return <PaymentsManager />;
      case 'notifications': return <NotificationsManager />;
      case 'mikrotik': return <MikroTikConfig />;
      default: return <div className="p-20 text-center text-slate-500">Feature arriving soon...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-slate-900"><Menu size={20} /></button>
            <div className="relative w-72 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200 h-8">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                bridgeOnline ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {checkingBridge ? <Loader2 size={12} className="animate-spin" /> : bridgeOnline ? <Link2 size={12} /> : <Link2Off size={12} />}
                {bridgeOnline ? 'Bridge Online' : 'Bridge Offline'}
              </div>
            </div>

            <button className="text-[10px] font-bold uppercase px-4 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200">
              Live Mode
            </button>
            <button onClick={() => setViewMode('client')} className="text-[10px] font-bold uppercase px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              Portal
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {!bridgeOnline && !isSimulated && !checkingBridge && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-700 animate-in slide-in-from-top-4 duration-500">
                <div className="p-2 bg-red-600 text-white rounded-lg">
                  <Terminal size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">Hardware Bridge Offline</h3>
                </div>
                <button onClick={checkBridge} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-2">
                  <RefreshCcw size={14} /> Reconnect
                </button>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
