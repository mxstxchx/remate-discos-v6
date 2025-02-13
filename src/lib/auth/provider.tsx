"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useAuth } from './hooks/use-auth'
import { useAuthStore } from './hooks/use-auth-store'

type AuthContextType = ReturnType<typeof useAuth>

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [initializing, setInitializing] = useState(true)
  const auth = useAuth()
  const supabase = useSupabase()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    async function checkSession() {
      try {
        console.log('Checking session...')
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('*')
          .gte('expires_at', new Date().toISOString())
          .limit(1)
          .single()

        if (activeSession) {
          console.log('Found active session:', activeSession)
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('alias', activeSession.user_alias)
            .single()

          setAuth({
            isAuthenticated: true,
            isAdmin: user.is_admin,
            alias: user.alias,
            session: activeSession,
            error: null
          })
        } else {
          console.log('No active session found')
        }
      } catch (error) {
        console.log('Session check error:', error)
      } finally {
        console.log('Setting initializing to false')
        setInitializing(false)
      }
    }

    checkSession()
  }, [supabase, setAuth])

  console.log('AuthProvider render:', { initializing })
  if (initializing) return null

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