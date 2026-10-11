import React from 'react';
import { ShieldCheck, Activity, BarChart2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* Left Side - Brand & Visuals (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-app-surface border-r border-app-border flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-accent-cyan/5 blur-[120px] rounded-full"></div>
          <div className="absolute top-[60%] -right-[20%] w-[60%] h-[60%] bg-accent-green/5 blur-[100px] rounded-full"></div>
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-3 mb-16">
            PERPETUA <span className="text-text-muted font-light">|</span> SENTINEL
          </h1>
          <h2 className="text-4xl font-semibold text-text-primary leading-tight max-w-md mb-6">
            Know your risk before the market does.
          </h2>
          <p className="text-text-secondary text-lg max-w-md">
            Institutional-grade monitoring for perpetual funding costs, exposure metrics, and liquidation defense.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 text-text-secondary">
            <div className="w-10 h-10 rounded-lg bg-app-elevated border border-app-border flex items-center justify-center">
              <Activity className="w-5 h-5 text-accent-cyan" />
            </div>
            <span className="text-sm font-medium">Real-time Margin Telemetry</span>
          </div>
          <div className="flex items-center gap-4 text-text-secondary">
            <div className="w-10 h-10 rounded-lg bg-app-elevated border border-app-border flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent-green" />
            </div>
            <span className="text-sm font-medium">Algorithmic Escalation Ladder</span>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}