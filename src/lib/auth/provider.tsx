"use client"

import { createContext, useContext, useEffect } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useAuth } from './hooks/use-auth'
import { useAuthStore } from './hooks/use-auth-store'
import type { AuthSession } from './types'

type AuthContextType = ReturnType<typeof useAuth>

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({
  children
}: {
  children: React.ReactNode
}) {
  const auth = useAuth()
  const supabase = useSupabase()
  const alias = useAuthStore((state) => state.alias)
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    if (!alias) return

    // Subscribe to session changes
    const channel = supabase
      .channel(`sessions:${alias}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `user_alias=eq.${alias}`
      }, (payload) => {
        const session = payload.new as AuthSession
        // Handle session expiry
        if (new Date(session.expires_at) <= new Date()) {
          auth.signOut()
        }
      })
      .subscribe()

    // Check session validity on mount
    const checkSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select()
        .eq('user_alias', alias)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle()

      if (!data) {
        auth.signOut()
      }
    }

    checkSession()

    return () => {
      channel.unsubscribe()
    }
  }, [alias, supabase, auth, setAuth])

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}