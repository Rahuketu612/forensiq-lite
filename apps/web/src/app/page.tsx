'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, isDevBypass } from '@/contexts';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const devMode = isDevBypass();

  useEffect(() => {
    if (!isLoading) {
      // Dev mode: go directly to dashboard
      if (devMode || isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, router, devMode]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </main>
  );
}