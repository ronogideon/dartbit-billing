
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Network, 
  FileText, 
  Settings, 
  LogOut,
  Zap,
  CheckCircle2,
  BellRing,
  Wallet,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Radio
} from 'lucide-react';
import { mikrotikService } from '../services/mikrotikService.ts';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isCollapsed, 
  onToggle,
  isMobileOpen,
  onMobileClose
}) => {
  const [counts, setCounts] = useState({ clients: 0, online: 0, nodes: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [clients, sessions, nodes] = await Promise.all([
        mikrotikService.getClients(),
        mikrotikService.getActiveSessions(),
        mikrotikService.getRouters()
      ]);
      setCounts({
        clients: clients.length,
        online: sessions.length,
        nodes: nodes.length
      });
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'clients', icon: Users, label: 'All Subscribers', count: counts.clients },
    { id: 'active-clients', icon: Radio, label: 'Live Sessions', count: counts.online },
    { id: 'billing', icon: Package, label: 'Service Plans' },
    { id: 'payments', icon: Wallet, label: 'Collections' },
    { id: 'notifications', icon: BellRing, label: 'Broadcasts' },
    { id: 'mikrotik', icon: Network, label: 'Access Nodes', count: counts.nodes },
    { id: 'reports', icon: FileText, label: 'Insights' },
    { id: 'settings', icon: Settings, label: 'System' },
  ];

  const handleNavClick = (id: string) => {
    onTabChange(id);
    if (window.innerWidth < 1024) {
      onMobileClose();
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-[55] lg:hidden backdrop-blur-sm" onClick={onMobileClose} />
      )}

      <div className={`fixed top-0 left-0 h-full bg-slate-900 text-white z-[60] transition-all duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'} ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            {(!isCollapsed || isMobileOpen) && <span className="text-xl font-bold tracking-tight">dartbit</span>}
          </div>
          {isMobileOpen && <button onClick={onMobileClose} className="ml-auto p-2 text-slate-400 hover:text-white lg:hidden"><X size={20} /></button>}
        </div>

        <button onClick={onToggle} className="absolute -right-3 top-20 bg-blue-600 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-900 hover:bg-blue-500 transition-colors z-50 hidden lg:flex">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.count !== undefined && (
                       <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${isActive ? 'bg-white/20 border-white/40 text-white' : 'border-slate-700 text-slate-500 group-hover:border-blue-500/50 group-hover:text-blue-400'}`}>
                         {item.count}
                       </span>
                    )}
                  </div>
                )}
                {isCollapsed && !isMobileOpen && (
                  <div className="absolute left-16 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-[70] border border-slate-700">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors rounded-xl ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}`}>
            <LogOut size={20} />
            {(!isCollapsed || isMobileOpen) && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
