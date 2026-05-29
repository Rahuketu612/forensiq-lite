'use client';

import { isDevBypass } from '@/contexts/auth-context';

export function DevModeBadge() {
  if (!isDevBypass()) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
        DEV MODE
      </div>
    </div>
  );
}