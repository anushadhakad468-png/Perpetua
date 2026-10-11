'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { LayoutDashboard, ShieldAlert, LineChart, Activity, Zap, Wallet, History, Settings, LogOut, Shield } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navGroups = [
    {
      title: 'Analytics',
      items: [
        { name: 'Overview', href: '/overview', icon: LayoutDashboard },
        { name: 'Risk Analytics', href: '/risk', icon: ShieldAlert },
        { name: 'Markets', href: '/markets', icon: LineChart },
        { name: 'Positions', href: '/positions', icon: Activity },
      ]
    },
    {
      title: 'Guardian',
      items: [
        { name: 'Active Alerts', href: '/alerts', icon: Zap },
        { name: 'Interventions', href: '/activity', icon: History },
      ]
    },
    {
      title: 'Portfolio',
      items: [
        { name: 'Wallets', href: '/wallets', icon: Wallet },
      ]
    }
  ];

  return (
    <div className="w-[240px] bg-app-sidebar border-r border-app-border hidden lg:flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-app-border shrink-0">
        <Link href="/overview" className="flex items-center gap-2 text-text-primary font-bold tracking-tight">
          <Shield size={18} className="text-accent-green" />
          PERPETUA
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link key={item.name} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                      isActive 
                        ? 'bg-app-elevated border border-app-border text-text-primary font-medium shadow-sm' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-app-surface border border-transparent'
                    }`}
                  >
                    <item.icon size={16} className={isActive ? 'text-accent-cyan' : 'text-text-muted'} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-app-border shrink-0">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-app-surface transition-colors mb-1">
          <Settings size={16} className="text-text-muted" /> Settings
        </Link>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-status-negative rounded-lg hover:bg-status-negative/10 transition-colors">
          <LogOut size={16} className="text-text-muted" /> Sign Out
        </button>
      </div>
    </div>
  );
}