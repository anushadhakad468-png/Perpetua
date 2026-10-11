'use client';
import { useWallet } from '@/providers/WalletProvider';
import { Bell, Search, Hexagon } from 'lucide-react';

export default function Topbar() {
  const { activeWallet, connect, isConnecting, disconnect } = useWallet();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="h-16 border-b border-app-border bg-app-bg/95 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-20 shrink-0">
      
      {/* Left: Global Search Mock */}
      <div className="flex-1 flex items-center">
        <div className="relative w-64 hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="Search markets, txs..." 
            className="w-full bg-app-surface border border-app-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-text-primary placeholder-text-muted focus:border-accent-cyan focus:outline-none transition-colors"
          />
        </div>
      </div>
      
      {/* Right: Network & Wallet */}
      <div className="flex items-center gap-4">
        {/* Network Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-app-surface border border-app-border rounded-lg">
          <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></div>
          <span className="text-[11px] font-mono font-medium text-text-secondary uppercase">Monad Testnet</span>
        </div>
        
        {/* Notifications */}
        <button className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-app-surface border border-transparent hover:border-app-border transition-all relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-status-warning rounded-full"></span>
        </button>

        <div className="h-6 w-px bg-app-border"></div>

        {/* Wallet Connection */}
        {activeWallet ? (
          <div className="flex items-center gap-2">
            <button onClick={disconnect} className="group flex items-center gap-2 px-3 py-1.5 bg-app-card border border-app-border rounded-lg hover:border-status-negative/50 transition-colors">
              <Hexagon size={14} className="text-accent-green" />
              <span className="font-mono text-xs text-text-primary group-hover:hidden">{formatAddress(activeWallet)}</span>
              <span className="font-mono text-xs text-status-negative hidden group-hover:inline">Disconnect</span>
            </button>
          </div>
        ) : (
          <button onClick={() => connect('Metamask')} disabled={isConnecting} 
            className="px-4 py-1.5 bg-text-primary hover:bg-text-secondary text-app-bg font-medium text-xs rounded-lg transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Approving...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}