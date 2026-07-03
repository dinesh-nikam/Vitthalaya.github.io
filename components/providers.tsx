'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { useFocusRestoration } from '@/src/lib/hooks/use-focus-restoration';

function FocusRestorer() {
  useFocusRestoration();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FocusRestorer />
      {children}
    </SessionProvider>
  );
}
