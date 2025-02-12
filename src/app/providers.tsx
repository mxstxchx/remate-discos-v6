"use client"

import { AuthProvider } from '@/lib/auth/provider'
import '@/i18n/config'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}