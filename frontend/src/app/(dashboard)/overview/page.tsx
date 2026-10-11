'use client';

import { useWallet } from '@/providers/WalletProvider';
import { Clock, ShieldCheck, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function Overview() {
  const { activeWallet } = useWallet();

  // Deterministic Demo Data
  const kpis = [
    { label: 'Est. Runway', value: '74.2', unit: 'hrs', desc: 'Before funding budget exhausted', icon: Clock, color: 'text-text-primary' },
    { label: 'Capital Saved', value: '$530.40', unit: '', desc: 'Verified avoided penalties', icon: ShieldCheck, color: 'text-status-positive' },
    { label: 'Risk Score', value: 'B+', unit: '', desc: 'Moderate · Concentration in SOL', icon: AlertTriangle, color: 'text-status-warning' },
    { label: 'Total Exposure', value: '$41,712', unit: '.50', desc: 'Across 2 open positions', icon: Wallet, color: 'text-text-primary' },
  ];

  const positions = [
    { market: 'BTC-PERP', dir: 'LONG', size: '0.25', entry: '83,210.00', mark: '83,930.00', pnl: '+45.20', liq: '71,450.00', margin: 82 },
    { market: 'SOL-PERP', dir: 'LONG', size: '150.0', entry: '142.50', mark: '138.20', pnl: '-120.50', liq: '125.00', margin: 18 },
  ];

  const funding = [
    { market: 'BTC-PERP', rate: '-0.0210%', apr: '-23.0%', type: 'Yield', next: '2h 14m' },
    { market: 'ETH-PERP', rate: '+0.0150%', apr: '+16.4%', type: 'Cost', next: '2h 14m' },
    { market: 'SOL-PERP', rate: '+0.0400%', apr: '+43.8%', type: 'Cost', next: '2h 14m' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1">Dashboard / Overview</div>
          <h1 className="text-2xl font-semibold text-text-primary">Real-time Risk Intelligence</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></span>
            LIVE
          </span>
          <span className="px-2 py-1 text-[10px] font-mono font-medium text-status-warning bg-status-warning/10 border border-status-warning/20 rounded">
            DEMO MODE
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-app-card border border-app-border rounded-xl p-5 hover:border-app-subtle transition-colors shadow-sm flex flex-col justify-between h-[120px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">{kpi.label}</span>
              <kpi.icon size={14} className="text-text-muted" />
            </div>
            <div>
              <div className={`text-3xl font-mono font-medium ${kpi.color}`}>
                {kpi.value}<span className="text-sm text-text-muted">{kpi.unit}</span>
              </div>
              <div className="text-[11px] text-text-muted mt-1">{kpi.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Data Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Open Positions (2 columns wide) */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Open Positions</h2>
            <Link href="/positions" className="text-xs text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1">
              View All <ExternalLink size={12} />
            </Link>
          </div>
          
          <div className="bg-app-card border border-app-border rounded-xl overflow-hidden flex-1">
            {!activeWallet ? (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center p-8 text-center">
                <Wallet size={32} className="text-text-muted mb-3" />
                <h3 className="text-sm font-medium text-text-primary mb-1">Connect your wallet</h3>
                <p className="text-xs text-text-secondary mb-4 max-w-[250px]">Inspect your positions, onchain exposure, and trading activity.</p>
                {/* Button delegates to the Topbar logic visually for the user */}
                <span className="text-xs font-mono text-text-muted px-3 py-1.5 border border-app-subtle rounded-lg bg-app-surface">Awaiting Connection</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-app-surface border-b border-app-border">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Market</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider text-right">Size</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider text-right">Entry / Mark</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider text-right">Unrealized PnL</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider text-right">Margin Buffer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {positions.map((pos, i) => (
                      <tr key={i} className="hover:bg-app-elevated/40 transition-colors group">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-1 h-3 rounded-full ${pos.dir === 'LONG' ? 'bg-status-positive' : 'bg-status-negative'}`}></div>
                            <span className="text-sm font-medium text-text-primary">{pos.market}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-app-surface border border-app-subtle text-text-secondary">{pos.dir}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm text-text-primary">{pos.size}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm text-text-secondary">
                          {pos.entry} <span className="text-text-muted mx-1">→</span> <span className="text-text-primary">{pos.mark}</span>
                        </td>
                        <td className={`px-4 py-3.5 text-right font-mono text-sm flex items-center justify-end gap-1 ${pos.pnl.includes('+') ? 'text-status-positive' : 'text-status-negative'}`}>
                          {pos.pnl.includes('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          ${pos.pnl.replace(/[+-]/, '')}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-app-surface rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pos.margin > 50 ? 'bg-status-positive' : 'bg-status-warning'}`} style={{ width: `${pos.margin}%` }}></div>
                            </div>
                            <span className="text-xs font-mono text-text-muted w-7">{pos.margin}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Funding Rates (1 column wide) */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Funding Rates</h2>
            <Link href="/markets" className="text-xs text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1">
              Analyze <ExternalLink size={12} />
            </Link>
          </div>
          
          <div className="bg-app-card border border-app-border rounded-xl overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-app-surface border-b border-app-border">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider text-right">8h Rate</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider text-right">Est. APR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {funding.map((f, i) => (
                    <tr key={i} className="hover:bg-app-elevated/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-text-primary">{f.market}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm text-text-secondary">{f.rate}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <span className={`font-mono text-sm ${f.type === 'Yield' ? 'text-status-positive' : 'text-status-negative'}`}>{f.apr}</span>
                           <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${f.type === 'Yield' ? 'bg-status-positive/10 text-status-positive border-status-positive/20' : 'bg-status-negative/10 text-status-negative border-status-negative/20'}`}>
                             {f.type}
                           </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Context Footer inside card */}
            <div className="px-4 py-3 border-t border-app-subtle bg-app-surface/50 text-[11px] text-text-muted flex justify-between">
              <span>Updated 12s ago</span>
              <span>Next interval: 2h 14m</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}