import { useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useStore, useSession } from '@/store';
import { CartOperationError } from '@/lib/errors';
import type { CartItem } from '@/types/database';

export function useCart() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const cartItems = useStore(state => state.cartItems);
  const setCartItems = useStore(state => state.setCartItems);

  const validateCart = useCallback(async () => {
    if (!session?.user_alias) {
      console.log('[Cart_Items] No session, skipping validation');
      return;
    }

    try {
      console.log('[Cart_Items] Starting cart validation for:', session.user_alias);
      
      // Get cart items with releases
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
        .eq('user_alias', session.user_alias);

      if (cartError) throw cartError;

      console.log('[Cart_Items] Found cart items:', cartItems?.length || 0);

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
        .eq('user_alias', session.user_alias);

      if (queueError) throw queueError;

      console.log('[Cart_Items] Found data:', {
        cartItems: cartItems?.length || 0,
        reservations: reservations?.length || 0,
        queuePositions: queuePositions?.length || 0
      });

      // Update status for each item
      const updatedItems = cartItems?.map(item => {
        const reservation = reservations?.find(r => r.release_id === item.release_id);
        const queuePosition = queuePositions?.find(q => q.release_id === item.release_id);
        
        let status = 'AVAILABLE';
        
        if (queuePosition) {
          status = 'IN_QUEUE';
          console.log('[Cart_Items] Item in queue:', {
            id: item.release_id,
            position: queuePosition.queue_position
          });
        } else if (reservation) {
          status = reservation.user_alias === session.user_alias ? 'RESERVED' : 'RESERVED_BY_OTHERS';
          console.log('[Cart_Items] Item reserved:', {
            id: item.release_id,
            by: reservation.user_alias,
            status
          });
        }

        return {
          ...item,
          status,
          queue_position: queuePosition?.queue_position
        };
      });

      console.log('[Cart_Items] Updated items:', updatedItems?.map(item => ({
        id: item.release_id,
        status: item.status,
        queuePos: item.queue_position
      })));

      setCartItems(updatedItems || []);
    } catch (error) {
      console.error('[Cart_Items] Cart validation failed:', error);
      throw new CartOperationError(
        'Failed to validate cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, supabase, setCartItems]);

  const addToCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      const existing = cartItems.find(item => item.release_id === recordId);
      if (existing) {
        console.log('[Cart_Items] Item already in cart:', recordId);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          release_id: recordId,
          user_alias: session.user_alias,
          status: 'AVAILABLE'
        })
        .select('*, releases(*)')
        .single();

      if (error) throw error;

      console.log('[Cart_Items] Added to cart:', {
        id: recordId,
        status: data.status
      });

      setCartItems([...cartItems, data]);
    } catch (error) {
      console.error('[Cart_Items] Add to cart failed:', error);
      throw new CartOperationError(
        'Failed to add item to cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, cartItems, setCartItems, supabase]);

  const removeFromCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias);

      console.log('[Cart_Items] Removed from cart:', recordId);
      setCartItems(cartItems.filter(item => item.release_id !== recordId));
    } catch (error) {
      console.error('[Cart_Items] Remove from cart failed:', error);
      throw new CartOperationError(
        'Failed to remove item from cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, cartItems, setCartItems, supabase]);

  return {
    items: cartItems,
    addToCart,
    removeFromCart,
    validateCart,
    isEmpty: cartItems.length === 0
  };
}