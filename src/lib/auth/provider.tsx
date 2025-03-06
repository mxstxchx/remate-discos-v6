import { createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from './hooks'
import { useStore } from '@/store'
import { useGlobalStatus } from '@/hooks/useGlobalStatus'

interface AuthContextType {
  signIn: (alias: string, language: 'es' | 'en') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const setSession = useStore((state) => state.setSession)
  const setCartItems = useStore((state) => state.setCartItems)
  const { refreshAllStatuses } = useGlobalStatus();

  const signIn = async (alias: string, language: 'es' | 'en') => {
    // Using the singleton supabase client from client.ts
    console.log('[AUTH] Starting sign in process for:', alias)
    try {
      // First upsert user
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          alias,
          created_at: new Date().toISOString()
        })

      if (userError) throw userError

      // Then fetch complete user data including admin status
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('alias', alias)
        .single()

      if (fetchError) throw fetchError

      console.log('[AUTH] User data fetched:', userData);

      // Create session with admin status in metadata
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          user_alias: alias,
          language,
          metadata: {
            is_admin: userData.is_admin,
            language
          }
        }])
        .select()
        .single()

      if (sessionError) throw sessionError

      console.log('[AUTH] Session created successfully:', session);
      setSession(session);

      try {
        // Get cart items using optimized batch query
        const { data: cartItems, error: cartError } = await supabase
          .from('cart_items')
          .select(`
            *,
            releases (
              id,
              title,
              price,
              artists,
              labels,
              thumb,
              primary_image
            )
          `)
          .eq('user_alias', alias);

        if (cartError) throw cartError;
        
        console.log(`[AUTH] Loaded ${cartItems?.length || 0} cart items`);
        
        // Refresh all statuses to get accurate information for this user
        await refreshAllStatuses();
        
        // Set cart items
        setCartItems(cartItems || []);
      } catch (error) {
        console.error('[AUTH] Failed to load cart items:', error);
      }

      // Update auth store state
      useAuthStore.getState().setAuthenticated(true);
      useAuthStore.getState().setModalOpen(false);
      useAuthStore.getState().setError(null);

      // Redirect admin users
      if (userData?.is_admin) {
        router.push('/admin');
      }

      console.log('[AUTH] Sign in process completed');
    } catch (error) {
      console.error('[AUTH] Sign in error:', error)
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