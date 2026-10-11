'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => signIn(email), 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Sign in to Terminal</h2>
        <p className="text-sm text-text-secondary">Access your risk dashboard and guardian settings.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">Email Address</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-app-surface border border-app-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan outline-none transition-all"
            placeholder="trader@institution.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">Password</label>
            <Link href="#" className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors">Forgot?</Link>
          </div>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-app-surface border border-app-border rounded-lg pl-4 pr-10 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan outline-none transition-all"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-text-primary text-app-bg font-semibold text-sm rounded-lg py-2.5 hover:bg-text-secondary transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
        >
          {isSubmitting ? 'Authenticating Session...' : 'Access Dashboard'}
          {!isSubmitting && <ArrowRight size={16} />}
        </button>
      </form>

      <div className="text-center text-sm">
        <span className="text-text-muted">New to Sentinel? </span>
        <Link href="/auth/sign-up" className="font-medium text-text-primary hover:text-accent-cyan transition-colors">Request Access</Link>
      </div>
    </div>
  );
}