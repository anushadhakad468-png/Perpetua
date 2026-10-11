"use client";

import React, { useState } from "react";
import { ShieldCheck, ExternalLink, Flame, AlertCircle, ArrowUpRight, Zap, CheckCircle2 } from "lucide-react";

export interface DefenseReceiptItem {
  id: string;
  timestamp: number;
  timestamp_iso: string;
  market: string;
  market_id: number;
  action_step: string;
  trigger_reason: string;
  margin_buffer_pct: number;
  mark_price: number;
  position_size_before: number;
  size_closed: number;
  position_size_remaining: number;
  order_type: string;
  estimated_penalty_saved: number;
  monad_tx_id: string;
  explorer_url: string;
}

interface ReceiptsFeedProps {
  receipts: DefenseReceiptItem[];
  onTriggerSimulate?: (step: string) => void;
  isSimulating?: boolean;
}

export const ReceiptsFeed: React.FC<ReceiptsFeedProps> = ({
  receipts,
  onTriggerSimulate,
  isSimulating = false,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<DefenseReceiptItem | null>(null);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-5">
      {/* Header and Live Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Transparency Receipts Feed
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Cryptographically signed audit trail of averted liquidations and preserved capital on Monad
          </p>
        </div>

        {/* Live Simulation Buttons for Hackathon Judges */}
        {onTriggerSimulate && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-yellow-400" /> Test Ladder:
            </span>
            <button
              disabled={isSimulating}
              onClick={() => onTriggerSimulate("STEP_A_LIMIT")}
              className="px-2.5 py-1 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-semibold transition disabled:opacity-50"
            >
              + Step A (50% Maker)
            </button>
            <button
              disabled={isSimulating}
              onClick={() => onTriggerSimulate("STEP_B_URGENT")}
              className="px-2.5 py-1 text-[11px] bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 rounded border border-orange-500/30 font-semibold transition disabled:opacity-50"
            >
              + Step B (Market)
            </button>
            <button
              disabled={isSimulating}
              onClick={() => onTriggerSimulate("STEP_C_TERMINAL")}
              className="px-2.5 py-1 text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded border border-red-500/30 font-semibold transition disabled:opacity-50"
            >
              + Step C (Emergency)
            </button>
          </div>
        )}
      </div>

      {/* Receipts Stream */}
      <div className="space-y-3">
        {receipts.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
            <span>No emergency liquidations required yet. Account health is protected.</span>
            <span className="text-[11px] text-gray-600 mt-1">
              Click &quot;Test Ladder&quot; above to simulate an emergency de-risk receipt.
            </span>
          </div>
        ) : (
          receipts.map((rcpt) => {
            const isTerminal = rcpt.action_step === "STEP_C_TERMINAL";
            const isUrgent = rcpt.action_step === "STEP_B_URGENT";
            const isStepA = rcpt.action_step === "STEP_A_LIMIT";

            return (
              <div
                key={rcpt.id}
                className="glass-panel p-4 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Step Tag & Saved Amount */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isTerminal ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-red-400" /> STEP C TERMINAL CLOSE
                      </span>
                    ) : isUrgent ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-orange-400" /> STEP B URGENT MARKET
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-amber-400" /> STEP A MAKER LIMIT CUT
                      </span>
                    )}

                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30">
                      {rcpt.market} Perp
                    </span>

                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Liquidation Avoided: Saved ${rcpt.estimated_penalty_saved.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 font-medium">
                    {rcpt.trigger_reason}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-gray-400 flex-wrap">
                    <span>
                      Size Closed: <strong className="text-white">{rcpt.size_closed} {rcpt.market}</strong>
                    </span>
                    <span>
                      Order Type: <strong className="text-purple-300">{rcpt.order_type}</strong>
                    </span>
                    <span>
                      Buffer: <strong className="text-amber-300">{rcpt.margin_buffer_pct}%</strong>
                    </span>
                    <span>
                      Exit: <strong className="text-white">${rcpt.mark_price.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Right: Explorer Link & Timestamp */}
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-gray-800 pt-2 md:pt-0 shrink-0">
                  <a
                    href={rcpt.explorer_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded border border-purple-500/20 transition"
                  >
                    <span>Monadscan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[10px] text-gray-500 md:mt-1 font-mono">
                    {new Date(rcpt.timestamp * 1000).toLocaleTimeString()} • {new Date(rcpt.timestamp * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
