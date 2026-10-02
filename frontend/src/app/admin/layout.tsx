import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/config/auth-context';

export const metadata: Metadata = {
  title: 'Administration',
  // L'espace d'administration ne doit jamais apparaître dans Google.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
