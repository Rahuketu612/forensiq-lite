'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, isDevBypass } from '@/contexts';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const devMode = isDevBypass();

  useEffect(() => {
    // In dev bypass mode, always allow access
    if (devMode) return;
    
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router, devMode]);

  if (isLoading && !devMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Dev mode or authenticated - show children
  if (devMode || isAuthenticated) {
    return <>{children}</>;
  }

  return null;
}