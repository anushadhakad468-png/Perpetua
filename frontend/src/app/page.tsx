'use client';
import Link from 'next/link';
import { ArrowRight, Shield, Activity, Coins } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <header className="px-8 py-6 flex justify-between items-center border-b border-app-border">
        <div className="text-xl font-bold tracking-tight">PERPETUA // SENTINEL</div>
        <div className="flex gap-4">
          <Link href="/auth/sign-in" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
          <Link href="/auth/sign-up" className="px-4 py-2 bg-accent-green text-app-bg text-sm font-medium rounded-md hover:bg-accent-green/90 transition-colors">Create Account</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-surface border border-app-border text-xs font-mono text-accent-cyan mb-8">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
          Monad Testnet Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-text-primary max-w-4xl mb-6">
          Know the cost of holding risk.
        </h1>
        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mb-10 leading-relaxed">
          Perpetua monitors perpetual funding costs, evaluates exposure, and helps traders make better-informed risk decisions before capital leaks away.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth/sign-up" className="px-6 py-3 bg-text-primary text-app-bg rounded-md font-medium hover:bg-text-secondary transition-colors flex items-center justify-center gap-2">
            Launch Sentinel <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/overview" className="px-6 py-3 bg-app-surface border border-app-border text-text-primary rounded-md font-medium hover:bg-app-elevated transition-colors">
            Explore Demo Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mt-32 text-left">
          <div className="p-6 bg-app-card border border-app-border rounded-lg">
            <Coins className="w-6 h-6 text-accent-cyan mb-4" />
            <h3 className="font-semibold mb-2">Funding Intelligence</h3>
            <p className="text-sm text-text-secondary">Compare funding rates across markets and estimate exact annualized holding costs based on actual intervals.</p>
          </div>
          <div className="p-6 bg-app-card border border-app-border rounded-lg">
            <Activity className="w-6 h-6 text-status-warning mb-4" />
            <h3 className="font-semibold mb-2">Risk Monitoring</h3>
            <p className="text-sm text-text-secondary">Track real-time leverage, exposure, and margin buffer decay before exchange liquidators intervene.</p>
          </div>
          <div className="p-6 bg-app-card border border-app-border rounded-lg">
            <Shield className="w-6 h-6 text-accent-green mb-4" />
            <h3 className="font-semibold mb-2">Guardian Actions</h3>
            <p className="text-sm text-text-secondary">Review algorithmic recommendations and transparent on-chain protective actions with verifiable receipts.</p>
          </div>
        </div>
      </main>
    </div>
  );
}