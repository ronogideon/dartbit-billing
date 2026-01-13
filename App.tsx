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

  const toggleSimulation = () => {
    const newState = !isSimulated;
    setIsSimulated(newState);
    mikrotikService.setSimulationMode(newState);
    if (newState) setBridgeOnline(true);
    else checkBridge();
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
          title="Live Sessions" 
          description="Real-time online clients fetched directly from your MikroTik nodes." 
        />
      );
      case 'billing': return <PlanManager />;
      case 'payments': return <PaymentsManager />;
      case 'notifications': return <NotificationsManager />;
      case 'mikrotik': return <MikroTikConfig />;
      default: return <div className="p-20 text-center text-slate-400">Section Coming Soon...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu size={20} /></button>
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-100 h-8">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                checkingBridge 
                  ? 'bg-slate-50 text-slate-400 border-slate-100' 
                  : bridgeOnline 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {checkingBridge ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : bridgeOnline ? (
                  <Link2 size={12} className="animate-pulse" />
                ) : (
                  <Link2Off size={12} />
                )}
                {checkingBridge ? 'Syncing...' : bridgeOnline ? 'Bridge Online' : 'Bridge Offline'}
              </div>
            </div>

            <button onClick={toggleSimulation} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isSimulated ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              {isSimulated ? 'Simulation Active' : 'Live Mode'}
            </button>
            <button onClick={() => setViewMode('client')} className="text-[10px] font-black uppercase px-4 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95">
              Portal
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {!bridgeOnline && !isSimulated && !checkingBridge && (
              <div className="mb-6 p-6 bg-slate-900 rounded-2xl flex items-center gap-6 text-white animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center text-red-500">
                  <Terminal size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Bridge Connection Failed</h3>
                  <p className="text-slate-400 text-xs mt-1">Dashboard cannot reach the backend server. Ensure <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400">node server.js</code> is running.</p>
                </div>
                <button onClick={checkBridge} className="px-6 py-2 bg-blue-600 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center gap-2">
                  <RefreshCcw size={16} /> Retry
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