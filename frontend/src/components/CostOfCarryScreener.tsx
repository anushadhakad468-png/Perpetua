"use client";

import React, { useState } from "react";
import { ArrowUpDown, TrendingUp, TrendingDown, DollarSign, Filter, Search, ShieldCheck } from "lucide-react";

export interface MarketItem {
  id: number;
  symbol: string;
  name: string;
  markPrice: number;
  oraclePrice: number;
  bestBid: number;
  bestAsk: number;
  spreadBps: number;
  initialMarginPct: number;
  maintenanceMarginPct: number;
  makerFeeBps: number;
  takerFeeBps: number;
  fundingIntervalSec: number;
  periodicRatePct: number;
  eightHourRatePct: number;
  annualizedApr: number;
  carryStatus: "Paid to Hold" | "Cost to Hold";
  totalHoldingCostBps: number;
}

interface CostOfCarryScreenerProps {
  markets: MarketItem[];
  onSelectMarket?: (market: MarketItem) => void;
}

export const CostOfCarryScreener: React.FC<CostOfCarryScreenerProps> = ({ markets, onSelectMarket }) => {
  const [filter, setFilter] = useState<"ALL" | "PAID" | "COST">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"apr" | "rate" | "spread" | "symbol">("apr");
  const [sortAsc, setSortAsc] = useState(false);

  // Filter
  const filtered = markets.filter((m) => {
    const matchesSearch =
      m.symbol.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "PAID") return m.carryStatus === "Paid to Hold";
    if (filter === "COST") return m.carryStatus === "Cost to Hold";
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortBy === "apr") diff = b.annualizedApr - a.annualizedApr;
    else if (sortBy === "rate") diff = b.eightHourRatePct - a.eightHourRatePct;
    else if (sortBy === "spread") diff = a.spreadBps - b.spreadBps;
    else if (sortBy === "symbol") diff = a.symbol.localeCompare(b.symbol);
    return sortAsc ? -diff : diff;
  });

  const handleSort = (type: "apr" | "rate" | "spread" | "symbol") => {
    if (sortBy === type) setSortAsc(!sortAsc);
    else {
      setSortBy(type);
      setSortAsc(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            Cost-of-Carry Screener
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time holding cost telemetry across Monad Perpl DEX markets (Funding + Spread + Execution Fees)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search market..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-900/80 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 w-36 sm:w-44"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex bg-gray-900/80 p-0.5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-md transition font-medium ${
                filter === "ALL" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              All ({markets.length})
            </button>
            <button
              onClick={() => setFilter("PAID")}
              className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                filter === "PAID" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3 h-3" /> Paid to Hold
            </button>
            <button
              onClick={() => setFilter("COST")}
              className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                filter === "COST" ? "bg-rose-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              <TrendingDown className="w-3 h-3" /> Cost to Hold
            </button>
          </div>
        </div>
      </div>

      {/* Screener Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-gray-950/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/40 font-semibold select-none">
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("symbol")}>
                <span className="flex items-center gap-1">
                  Asset <ArrowUpDown className="w-3 h-3 opacity-60" />
                </span>
              </th>
              <th className="py-3 px-4">Mark Price</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("rate")}>
                <span className="flex items-center gap-1">
                  8h Funding Rate <ArrowUpDown className="w-3 h-3 opacity-60" />
                </span>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("apr")}>
                <span className="flex items-center gap-1">
                  Annualized APR <ArrowUpDown className="w-3 h-3 opacity-60" />
                </span>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("spread")}>
                <span className="flex items-center gap-1">
                  Spread (bps) <ArrowUpDown className="w-3 h-3 opacity-60" />
                </span>
              </th>
              <th className="py-3 px-4">Maint. Margin</th>
              <th className="py-3 px-4">Fees (Maker/Taker)</th>
              <th className="py-3 px-4">Carry Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-medium">
            {sorted.map((m) => {
              const isPaid = m.carryStatus === "Paid to Hold";
              return (
                <tr
                  key={m.id}
                  onClick={() => onSelectMarket?.(m)}
                  className="hover:bg-purple-900/10 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] border border-purple-500/30">
                      {m.symbol.slice(0, 3)}
                    </span>
                    <div>
                      <div>{m.symbol}</div>
                      <div className="text-[10px] text-gray-500 font-normal">{m.name}</div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    ${m.markPrice < 1 ? m.markPrice.toFixed(5) : m.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <span
                      className={`font-semibold ${
                        m.eightHourRatePct > 0
                          ? "text-rose-400"
                          : m.eightHourRatePct < 0
                          ? "text-emerald-400"
                          : "text-gray-400"
                      }`}
                    >
                      {m.eightHourRatePct > 0 ? "+" : ""}
                      {m.eightHourRatePct.toFixed(4)}%
                    </span>
                    <span className="block text-[10px] text-gray-500">
                      {(m.fundingIntervalSec / 60).toFixed(0)}m interval
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isPaid
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {m.annualizedApr > 0 ? "+" : ""}
                      {m.annualizedApr.toFixed(2)}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-gray-300 font-mono">
                    {m.spreadBps.toFixed(2)} bps
                  </td>

                  <td className="py-3.5 px-4 text-gray-300">
                    {m.maintenanceMarginPct.toFixed(1)}%
                  </td>

                  <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                    <span className="text-emerald-400">{m.makerFeeBps.toFixed(2)}</span> /{" "}
                    <span className="text-gray-300">{m.takerFeeBps.toFixed(2)} bps</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        isPaid
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {isPaid ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {m.carryStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-8 text-center text-gray-500 text-xs">
          No markets match your filter criteria.
        </div>
      )}
    </div>
  );
};
