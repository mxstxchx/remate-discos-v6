"use client"

import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth/provider';
import { useGlobalStatus } from '@/hooks/useGlobalStatus';
import { ErrorSuppressor } from '@/components/ErrorSuppressor';
import '@/i18n/config';

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize optimized global status management
  useGlobalStatus();

  return (
    <AuthProvider>
      <ErrorSuppressor />
      {children}
    </AuthProvider>
  );
}