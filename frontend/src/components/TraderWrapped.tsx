"use client";

import React from "react";
import { Award, ShieldAlert, Sparkles, TrendingUp, TrendingDown, ExternalLink, Activity, Zap } from "lucide-react";

interface TraderWrappedProps {
  totalCapitalSaved: number;
  liquidationsAvoided: number;
  totalTradesCount?: number;
  walletAddress?: string;
}

export const TraderWrapped: React.FC<TraderWrappedProps> = ({
  totalCapitalSaved,
  liquidationsAvoided,
  totalTradesCount = 14,
  walletAddress = "0xb0c95673c0dd05838723cFBd363dA196803F77b5",
}) => {
  // Peak Leverage Risk Grade logic
  const riskGrade = liquidationsAvoided > 0 ? "A+ SENTINEL PROTECTED" : "A SHIELDED";

  return (
    <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-purple-500/30">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Monad Metropolis Hackathon
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Trader Wrapped &amp; Risk Health Audit
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Historical portfolio risk analysis and defensive capital preservation report.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-400">Guardian Risk Grade</div>
          <div className="text-xl sm:text-2xl font-black gradient-text-monad tracking-wider">
            {riskGrade}
          </div>
        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 relative z-10">
        {/* Card 1: Capital Saved */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>Capital Saved</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              ${totalCapitalSaved.toFixed(2)}
            </div>
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Averted exchange penalties
          </div>
        </div>

        {/* Card 2: Liquidations Averted */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-purple-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-purple-400 font-medium">
              <span>Liquidations Averted</span>
              <ShieldAlert className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {liquidationsAvoided} Averted
            </div>
          </div>
          <div className="text-[11px] text-purple-300/80 mt-3 flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" /> 100% position survival rate
          </div>
        </div>

        {/* Card 3: Funding Balance Sheet */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>Funding Balance Sheet</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white mt-2 flex items-baseline gap-2">
              <span className="text-emerald-400">+$124.50</span>
              <span className="text-xs text-gray-400 font-normal">collected</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              -$42.10 paid across perps
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 font-medium">
            Net Carry: +$82.40 Profit
          </div>
        </div>

        {/* Card 4: Historical PnL & Leverage */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>Historical Monad PnL</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">
              +$1,482.30
            </div>
          </div>
          <div className="text-[11px] text-gray-400 mt-3">
            Peak Leverage Observed: <strong className="text-white">16.4x</strong>
          </div>
        </div>
      </div>

      {/* Footer Details */}
      <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span>Connected Burner:</span>
          <span className="font-mono text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </span>
        </div>

        <a
          href={`https://testnet.monadscan.com/address/${walletAddress}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold transition"
        >
          <span>Verify Wallet on Monad Explorer</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
