'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if they aren't authenticated
    if (!isLoading && !user) {
      router.push('/auth/sign-in');
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 h-full">
            
            {/* Show loading state while checking auth */}
            {(isLoading || !user) && (
              <div className="flex items-center justify-center h-64 text-text-muted font-mono text-sm">
                Restoring session...
              </div>
            )}

            {/* Always keep children in the DOM to satisfy Next.js, just hide it until ready */}
            <div className={isLoading || !user ? 'hidden' : 'block'}>
              {children}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}