import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'ऑफलाइन — Digital Pandharpur',
  description: 'You are offline. Some content may not be available.',
  robots: { index: false, follow: false },
};

export default function OfflineLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
