"use client"

import { createContext, useContext } from 'react'
import { useAuth } from './hooks/use-auth'

type AuthContextType = ReturnType<typeof useAuth>

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({
  children
}: {
  children: React.ReactNode
}) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
 const { signIn } = useContext(AuthContext)
 const setModalOpen = useAuthStore((state) => state.setModalOpen)
 const setAuthenticated = useAuthStore((state) => state.setAuthenticated)
 return { signIn, setModalOpen, setAuthenticated }
}
  }
  return context
}