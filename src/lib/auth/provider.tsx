import { createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuthStore } from './hooks'
import { useStore } from '@/store'

interface AuthContextType {
  signIn: (alias: string, language: 'es' | 'en') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const setSession = useStore((state) => state.setSession)
  const setCartItems = useStore((state) => state.setCartItems)

  const signIn = async (alias: string, language: 'es' | 'en') => {
    const supabase = createClientComponentClient()
    console.log('[Cart_Items] Starting sign in process for:', alias)
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

      console.log('[Auth] User data fetched:', userData);

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

      console.log('[Cart_Items] Auth success, session created:', session);
      setSession(session);

      try {
        // Get cart items
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
        
        // Get reservations for these items
        const { data: reservations, error: resError } = await supabase
          .from('reservations')
          .select('release_id, user_alias, status')
          .in('release_id', cartItems?.map(item => item.release_id) || [])
          .eq('status', 'RESERVED');

        if (resError) throw resError;

        // Get queue positions
        const { data: queuePositions, error: queueError } = await supabase
          .from('reservation_queue')
          .select('release_id, queue_position')
          .in('release_id', cartItems?.map(item => item.release_id) || [])
          .eq('user_alias', alias);

        if (queueError) throw queueError;

        // Update status for each item
        const updatedItems = cartItems?.map(item => {
          const reservation = reservations?.find(r => r.release_id === item.release_id);
          const queuePosition = queuePositions?.find(q => q.release_id === item.release_id);
          
          let status = 'AVAILABLE';
          
          if (queuePosition) {
            status = 'IN_QUEUE';
          } else if (reservation) {
            status = reservation.user_alias === alias ? 'RESERVED' : 'RESERVED_BY_OTHERS';
          }

          return {
            ...item,
            status,
            queue_position: queuePosition?.queue_position
          };
        });

        console.log('[Cart_Items] Setting initial cart items with status:',
          updatedItems?.map(item => ({
            id: item.release_id,
            status: item.status,
            queuePos: item.queue_position
          }))
        );
        
        setCartItems(updatedItems || []);
      } catch (error) {
        console.error('[Cart_Items] Failed to load cart items:', error);
      }

      // Update global state
      useStore.getState().fetchAllStatuses?.();
      useAuthStore.getState().setAuthenticated(true);
      useAuthStore.getState().setModalOpen(false);
      useAuthStore.getState().setError(null);

      // Redirect admin users
      if (userData?.is_admin) {
        router.push('/admin');
      }

      console.log('[Cart_Items] Sign in process completed');
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