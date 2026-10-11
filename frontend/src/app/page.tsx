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

export default function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const markets: Market[] = [
    { id: 16, symbol: 'BTC-PERP', funding_8h: '-0.021%', apr: '-23.0%', status: 'Paid to Hold' },
    { id: 17, symbol: 'ETH-PERP', funding_8h: '+0.015%', apr: '+16.4%', status: 'Cost to Hold' },
    { id: 18, symbol: 'SOL-PERP', funding_8h: '+0.040%', apr: '+43.8%', status: 'Cost to Hold' },
    { id: 19, symbol: 'MON-PERP', funding_8h: '-0.008%', apr: '-8.7%', status: 'Paid to Hold' },
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">PERPETUA // SENTINEL</h1>
          <p className="text-sm text-neutral-400">Risk-First Onchain Guardian on Monad</p>
        </div>
        <div className="text-xs px-3 py-1 bg-emerald-950 border border-emerald-500/30 text-emerald-400 rounded-full font-mono">
          ● Monad Testnet (10143)
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Top Metrics Row: Runway Gauge & Trader Wrapped Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Estimated Runway</div>
            <div className="text-3xl font-bold font-mono text-emerald-400 mt-2">74.2 hrs</div>
            <div className="text-xs text-neutral-500 mt-1">Safe from funding rate drain</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Capital Saved</div>
            <div className="text-3xl font-bold font-mono text-cyan-400 mt-2">$530.40</div>
            <div className="text-xs text-neutral-500 mt-1">Exchange penalties prevented</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Risk Grade</div>
            <div className="text-3xl font-bold font-mono text-amber-400 mt-2">B+ (Moderate)</div>
            <div className="text-xs text-neutral-500 mt-1">Peak leverage: 4.8x</div>
          </div>
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cost of Carry Screener */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-neutral-200">Cost-of-Carry Screener</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-neutral-500 border-b border-neutral-800 pb-2">
                  <tr>
                    <th className="py-2">Market</th>
                    <th>8h Rate</th>
                    <th>APR</th>
                    <th>Carry Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {markets.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-800/30">
                      <td className="py-3 font-medium">{m.symbol}</td>
                      <td className="font-mono text-neutral-300">{m.funding_8h}</td>
                      <td className="font-mono text-neutral-300">{m.apr}</td>
                      <td>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            m.status === 'Paid to Hold'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Guardian Intervention Audit */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-neutral-200">Guardian Receipts</h2>
              <span className="text-xs text-neutral-500 font-mono">Live Logs</span>
            </div>

            {loading ? (
              <p className="text-sm text-neutral-500">Checking logs...</p>
            ) : receipts.length === 0 ? (
              <div className="text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-lg p-6 text-center">
                No interventions yet. Positions healthy.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[300px]">
                {receipts.map((r, i) => (
                  <div key={i} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-neutral-200">{r.market || 'BTC-PERP'}</div>
                      <div className="text-xs text-neutral-500">{r.action_step || 'STEP_A_LIMIT'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-mono font-medium">+{r.estimated_penalty_saved || '$265.20'}</div>
                      <div className="text-xs text-neutral-500">Penalty Saved</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}