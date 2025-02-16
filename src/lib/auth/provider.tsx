import { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from './hooks'

interface AuthContextType {
 signIn: (alias: string, language: 'es' | 'en') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
 const signIn = async (alias: string, language: 'es' | 'en') => {
   try {
     // Sign in logic here
     useAuthStore.getState().setAuthenticated(true)
     useAuthStore.getState().setModalOpen(false)
   } catch (error) {
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