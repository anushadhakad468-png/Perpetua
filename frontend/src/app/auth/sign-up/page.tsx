'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => signIn(email), 600);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Email address</label>
        <div className="mt-1">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="block w-full appearance-none rounded-md border border-app-border bg-app-input px-3 py-2 text-text-primary placeholder-text-muted focus:border-accent-cyan focus:outline-none sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary">Password</label>
        <div className="mt-1">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="block w-full appearance-none rounded-md border border-app-border bg-app-input px-3 py-2 text-text-primary placeholder-text-muted focus:border-accent-cyan focus:outline-none sm:text-sm"
          />
        </div>
      </div>

      <button type="submit" disabled={isSubmitting}
        className="flex w-full justify-center rounded-md border border-transparent bg-text-primary py-2 px-4 text-sm font-medium text-app-bg shadow-sm hover:bg-text-secondary focus:outline-none disabled:opacity-50"
      >
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </button>

      <div className="text-center text-sm">
        <span className="text-text-muted">Already have an account? </span>
        <Link href="/auth/sign-in" className="font-medium text-accent-cyan hover:text-accent-cyan/80">Sign in</Link>
      </div>
    </form>
  );
}