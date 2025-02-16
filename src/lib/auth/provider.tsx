import { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from './hooks'

interface AuthContextType {
 signIn: (alias: string, language: 'es' | 'en') => Promise<void>
 setModalOpen: (open: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
 const setModalOpen = useAuthStore(state => state.setModalOpen)

 const signIn = async (alias: string, language: 'es' | 'en') => {
   try {
     // Sign in logic here
     useAuthStore.getState().setAuthenticated(true)
     setModalOpen(false)
   } catch (error) {
     useAuthStore.getState().setError(error instanceof Error ? error.message : 'Unknown error')
   }
 }

 return (
   <AuthContext.Provider value={{ signIn, setModalOpen }}>
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