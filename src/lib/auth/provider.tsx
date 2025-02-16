import { createContext, useContext, ReactNode } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuthStore } from './hooks'
import { useStore } from '@/store'

interface AuthContextType {
  signIn: (alias: string, language: 'es' | 'en') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient()
  const setSession = useStore((state) => state.setSession)

  const signIn = async (alias: string, language: 'es' | 'en') => {
    try {
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          alias,
          created_at: new Date().toISOString()
        })

      if (userError) throw userError

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          user_alias: alias,
          language,
          metadata: {}
        }])
        .select()
        .single()

      if (sessionError) throw sessionError

      setSession(session)
      useAuthStore.getState().setAuthenticated(true)
      useAuthStore.getState().setModalOpen(false)
      useAuthStore.getState().setError(null)
    } catch (error) {
      console.error('Sign in error:', error)
      useAuthStore.getState().setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return (
    <AuthContext.Provider value={{ signIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}