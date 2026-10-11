'use client';

import { useState, useEffect } from 'react';

interface Market {
  id: number;
  symbol: string;
  funding_8h: string;
  apr: string;
  status: 'Cost to Hold' | 'Paid to Hold';
}

interface Receipt {
  id?: string;
  timestamp_iso?: string;
  market?: string;
  action_step?: string;
  estimated_penalty_saved?: string;
}

interface Position {
  symbol: string;
  type: 'LONG' | 'SHORT';
  size: string;
  entry: string;
  mark: string;
  buffer: number;
}

export default function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded Mock Data for the visual glow-up
  const markets: Market[] = [
    { id: 16, symbol: 'BTC-PERP', funding_8h: '-0.021%', apr: '-23.0%', status: 'Paid to Hold' },
    { id: 17, symbol: 'ETH-PERP', funding_8h: '+0.015%', apr: '+16.4%', status: 'Cost to Hold' },
    { id: 18, symbol: 'SOL-PERP', funding_8h: '+0.040%', apr: '+43.8%', status: 'Cost to Hold' },
    { id: 19, symbol: 'MON-PERP', funding_8h: '-0.008%', apr: '-8.7%', status: 'Paid to Hold' },
  ];

  const activePositions: Position[] = [
    { symbol: 'BTC-PERP', type: 'LONG', size: '0.25 BTC', entry: '$83,210', mark: '$83,930', buffer: 82 },
    { symbol: 'ETH-PERP', type: 'SHORT', size: '14.0 ETH', entry: '$2,580', mark: '$2,546', buffer: 45 },
    { symbol: 'SOL-PERP', type: 'LONG', size: '150 SOL', entry: '$142.50', mark: '$138.20', buffer: 18 }, // Danger zone
  ];

  useEffect(() => {
    fetch('/api/receipts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReceipts(data);
        else if (data.receipts) setReceipts(data.receipts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300 p-4 md:p-8 font-sans selection:bg-emerald-900 selection:text-emerald-400">
      
      {/* Top Navigation & Status Bar */}
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            PERPETUA <span className="text-neutral-600">|</span> SENTINEL
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-1">Autonomous Onchain Risk Guardian</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex flex-col text-right">
            <span className="text-xs text-neutral-500 font-mono">Burner Wallet</span>
            <span className="text-sm text-neutral-300 font-mono">0xb0c9...77b5</span>
          </div>
          <div className="h-8 w-px bg-neutral-800 hidden md:block"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-900/50 rounded text-emerald-400 font-mono text-xs shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            MONAD TESTNET: SYNCED
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        
        {/* Quad Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111] border border-neutral-800 p-5 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full"></div>
            <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">Est. Runway</div>
            <div className="text-3xl font-bold font-mono text-emerald-400">74.2 <span className="text-lg text-neutral-500">hrs</span></div>
            <div className="text-xs text-neutral-600 mt-2 font-mono border-t border-neutral-800 pt-2">Safe from funding drain</div>
          </div>

          <div className="bg-[#111] border border-neutral-800 p-5 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 blur-2xl rounded-full"></div>
            <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">Capital Saved</div>
            <div className="text-3xl font-bold font-mono text-cyan-400">$530<span className="text-lg text-neutral-500">.40</span></div>
            <div className="text-xs text-neutral-600 mt-2 font-mono border-t border-neutral-800 pt-2">Penalties averted on-chain</div>
          </div>

          <div className="bg-[#111] border border-neutral-800 p-5 rounded-lg">
            <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">Risk Grade</div>
            <div className="text-3xl font-bold font-mono text-amber-400">B+</div>
            <div className="text-xs text-neutral-600 mt-2 font-mono border-t border-neutral-800 pt-2">Peak Leverage: 4.8x</div>
          </div>

          <div className="bg-[#111] border border-neutral-800 p-5 rounded-lg">
            <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">Gas Consumed</div>
            <div className="text-3xl font-bold font-mono text-purple-400">0.004 <span className="text-lg text-neutral-500">MON</span></div>
            <div className="text-xs text-neutral-600 mt-2 font-mono border-t border-neutral-800 pt-2">Total execution cost</div>
          </div>
        </div>

        {/* Active Positions Matrix */}
        <section className="bg-[#111] border border-neutral-800 rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-300">Active Monitored Positions</h2>
            <span className="text-xs text-neutral-500 font-mono">Polling: 3.0s</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-xs text-neutral-600 font-mono border-b border-neutral-800">
                <tr>
                  <th className="py-3 font-normal">Market</th>
                  <th className="font-normal">Size</th>
                  <th className="font-normal">Entry / Mark</th>
                  <th className="font-normal">Margin Buffer (Health)</th>
                  <th className="text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {activePositions.map((pos, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${pos.type === 'LONG' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className="font-medium text-neutral-200">{pos.symbol}</span>
                        <span className="text-xs text-neutral-500 font-mono">{pos.type}</span>
                      </div>
                    </td>
                    <td className="font-mono text-neutral-300">{pos.size}</td>
                    <td className="font-mono text-neutral-400">
                      {pos.entry} <span className="text-neutral-600 mx-1">→</span> <span className="text-neutral-200">{pos.mark}</span>
                    </td>
                    <td className="w-1/3 pr-8">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${pos.buffer > 50 ? 'bg-emerald-500' : pos.buffer > 20 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`}
                            style={{ width: `${pos.buffer}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-mono text-neutral-400 w-8">{pos.buffer}%</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className={`text-xs font-mono px-2 py-1 rounded ${
                        pos.buffer > 20 
                          ? 'bg-neutral-900 text-neutral-400 border border-neutral-800' 
                          : 'bg-rose-950/50 text-rose-400 border border-rose-900/50'
                      }`}>
                        {pos.buffer > 20 ? 'SAFE' : 'LADDER ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Two-Column Layout for Screener & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Cost of Carry Screener */}
          <section className="bg-[#111] border border-neutral-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-300 mb-4">Cost-of-Carry Screener</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-neutral-600 font-mono border-b border-neutral-800">
                  <tr>
                    <th className="py-3 font-normal">Market</th>
                    <th className="font-normal">8h Rate</th>
                    <th className="font-normal">Implied APR</th>
                    <th className="text-right font-normal">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {markets.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-medium text-neutral-200">{m.symbol}</td>
                      <td className="font-mono text-neutral-400">{m.funding_8h}</td>
                      <td className="font-mono text-neutral-400">{m.apr}</td>
                      <td className="text-right">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
                          m.status === 'Paid to Hold'
                            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50'
                            : 'bg-rose-950/30 text-rose-400 border-rose-900/50'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Guardian Intervention Terminal */}
          <section className="bg-black border border-neutral-800 rounded-lg p-0 overflow-hidden flex flex-col">
            <div className="bg-[#111] border-b border-neutral-800 px-4 py-3 flex justify-between items-center">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-300">Guardian CLI Console</h2>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
              </div>
            </div>

            <div className="p-4 bg-black flex-1 font-mono text-xs overflow-y-auto max-h-[250px] custom-scrollbar">
              {loading ? (
                <div className="text-neutral-600 animate-pulse">Initializing watcher daemon...</div>
              ) : receipts.length === 0 ? (
                <div className="text-neutral-600">
                  <span className="text-emerald-500 mr-2">➜</span> Sentinel monitoring active. No interventions recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.map((r, i) => (
                    <div key={i} className="text-neutral-400 border-l border-neutral-800 pl-3">
                      <div className="text-neutral-500 mb-1">
                        [{new Date().toISOString().split('T')[1].slice(0,8)}] <span className="text-cyan-500">EVENT_TRIGGERED</span>
                      </div>
                      <div className="text-neutral-300">
                        Market: <span className="text-white">{r.market || 'BTC-PERP'}</span> | 
                        Action: <span className={r.action_step?.includes('TERMINAL') ? 'text-rose-400' : 'text-amber-400'}>{r.action_step || 'STEP_A_LIMIT'}</span>
                      </div>
                      <div className="text-emerald-400 mt-1">
                        ↳ Liquidator penalty averted. Saved {r.estimated_penalty_saved || '$265.20'}
                      </div>
                    </div>
                  ))}
                  <div className="text-neutral-600 animate-pulse">
                    <span className="text-emerald-500 mr-2">➜</span> Polling block...
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}