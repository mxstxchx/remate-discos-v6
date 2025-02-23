"use client"

import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth/provider';
import { useRecordStatuses } from '@/hooks/useRecordStatuses';
import '@/i18n/config';

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize status management
  useRecordStatuses();

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}