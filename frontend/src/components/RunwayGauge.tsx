"use client";

import React, { useState } from "react";
import { Shield, AlertTriangle, Flame, Clock, Zap, ArrowDownRight, RefreshCw } from "lucide-react";

interface PositionData {
  symbol: string;
  side: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  notionalValue: number;
  collateral: number;
  currentMargin: number;
  unrealizedPnl: number;
  maintenanceMarginRequired: number;
  marginBufferPct: number;
  runwayHours: number;
  hourlyFundingDrainUsd: number;
  liquidationPrice: number;
  priceDropToLiqPct: number;
  escalationStage: string;
  stepDescription: string;
}

interface RunwayGaugeProps {
  position: PositionData | null;
  onShockChange: (shock: number) => void;
  shockValue: number;
  onTriggerIntervention?: (step: string) => void;
}

export const RunwayGauge: React.FC<RunwayGaugeProps> = ({
  position,
  onShockChange,
  shockValue,
  onTriggerIntervention,
}) => {
  if (!position) return null;

  const buffer = position.marginBufferPct;
  const runwayHours = position.runwayHours;

  // Determine color states based on Escalation Ladder
  let gaugeColor = "#10B981"; // Healthy Emerald
  let stageLabel = "HEALTHY BUFFER";
  let stageBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

  if (buffer < 3.0) {
    gaugeColor = "#EF4444"; // Terminal Red
    stageLabel = "STEP C: TERMINAL RISK";
    stageBadgeClass = "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse";
  } else if (buffer < 10.0) {
    gaugeColor = "#F97316"; // Urgent Orange
    stageLabel = "STEP B: URGENT DE-RISK";
    stageBadgeClass = "bg-orange-500/10 text-orange-400 border-orange-500/30";
  } else if (buffer < 20.0) {
    gaugeColor = "#F59E0B"; // Warning Amber
    stageLabel = "STEP A: WARNING BUFFER";
    stageBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  }

  // Calculate circular SVG progress
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const boundedPct = Math.max(0, Math.min(100, buffer));
  const strokeDashoffset = circumference - (boundedPct / 100) * circumference;

  return (
    <div className="glass-panel-glow rounded-2xl p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: gaugeColor }}
      />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Interactive Radial Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 180 180">
              {/* Background ring */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="stroke-gray-800"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Progress ring */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                stroke={gaugeColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute flex flex-col items-center text-center">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {buffer > 999 ? ">999%" : `${buffer.toFixed(1)}%`}
              </span>
              <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                Margin Buffer
              </span>
              <span
                className={`mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stageBadgeClass}`}
              >
                {stageLabel}
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Funding Survival Runway:</span>
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              {runwayHours > 500 ? "500+ Hours" : `${runwayHours.toFixed(1)} Hours`}
              <span className="text-xs text-gray-400 font-normal ml-1">
                (~{(runwayHours / 24).toFixed(1)} days)
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Active Position Telemetry */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold text-xs border border-purple-500/30">
                  {position.symbol}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {position.side} {position.size} BTC
                </span>
                <span className="text-xs text-gray-400">
                  @ ${position.entryPrice.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{position.stepDescription}</p>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-400">Unrealized PnL</div>
              <div
                className={`text-sm font-bold ${
                  position.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {position.unrealizedPnl >= 0 ? "+" : ""}${position.unrealizedPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="glass-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-gray-400 block">Notional Value</span>
              <span className="font-semibold text-white">
                ${position.notionalValue.toLocaleString()}
              </span>
            </div>
            <div className="glass-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-gray-400 block">Current Margin</span>
              <span className="font-semibold text-white">
                ${position.currentMargin.toLocaleString()}
              </span>
            </div>
            <div className="glass-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-gray-400 block">Maint. Required</span>
              <span className="font-semibold text-white">
                ${position.maintenanceMarginRequired.toLocaleString()}
              </span>
            </div>
            <div className="glass-panel p-2.5 rounded-lg border border-white/5">
              <span className="text-gray-400 block">Liq. Distance</span>
              <span className="font-semibold text-rose-400">
                -${(position.markPrice - position.liquidationPrice).toFixed(0)} ({position.priceDropToLiqPct.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Escalation Roadmap Visual Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span className="font-medium text-purple-300">Escalation Ladder Protection</span>
              <span>Monad Testnet Auto-Execution</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div
                className={`p-2 rounded border flex flex-col justify-between ${
                  buffer < 20.0 && buffer >= 10.0
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                    : "bg-gray-900/60 border-white/5 text-gray-400"
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-400" /> Step A (&lt;20%)
                </span>
                <span className="mt-1">50% Maker Limit Cut</span>
              </div>
              <div
                className={`p-2 rounded border flex flex-col justify-between ${
                  buffer < 10.0 && buffer >= 3.0
                    ? "bg-orange-500/20 border-orange-500/50 text-orange-200"
                    : "bg-gray-900/60 border-white/5 text-gray-400"
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-orange-400" /> Step B (&lt;10%)
                </span>
                <span className="mt-1">Urgent Market De-Risk</span>
              </div>
              <div
                className={`p-2 rounded border flex flex-col justify-between ${
                  buffer < 3.0
                    ? "bg-red-500/20 border-red-500/50 text-red-200 animate-pulse"
                    : "bg-gray-900/60 border-white/5 text-gray-400"
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-400" /> Step C (&lt;3%)
                </span>
                <span className="mt-1">Emergency Full Close</span>
              </div>
            </div>
          </div>

          {/* Interactive Stress-Test Slider */}
          <div className="pt-2 border-t border-gray-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-300 flex items-center gap-1 font-medium">
                <Zap className="w-3.5 h-3.5 text-yellow-400" /> Live Stress-Test Shock Simulation:
              </span>
              <span className="font-bold text-purple-400">
                {shockValue === 0 ? "Live Price" : `${shockValue}% Drop`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-22"
                max="0"
                step="1"
                value={shockValue}
                onChange={(e) => onShockChange(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <button
                onClick={() => onShockChange(0)}
                className="px-2 py-1 text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-white/10 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>-22% (Terminal Step C)</span>
              <span>-15% (Urgent Step B)</span>
              <span>-8% (Warning Step A)</span>
              <span>0% (Live Price)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
