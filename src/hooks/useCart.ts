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

  const addToCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      // Check if item is already in cart
      const existing = cartItems.find(item => item.release_id === recordId);
      if (existing) {
        console.log('[CART] Item already in cart:', recordId);
        return;
      }
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          release_id: recordId,
          user_alias: session.user_alias,
          status: 'AVAILABLE' // Will be validated by trigger
        })
        .select('*, releases(*)')
        .single();

      if (error) throw error;

      console.log('[CART] Item added:', data);
      setCartItems([...cartItems, data]);
    } catch (error) {
      console.error('[CART] Add to cart failed:', error);
      throw new CartOperationError(
        'Failed to add item to cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, cartItems, setCartItems]);

  const removeFromCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias);

      console.log('[CART] Item removed:', recordId);
      setCartItems(cartItems.filter(item => item.release_id !== recordId));
    } catch (error) {
      console.error('[CART] Remove from cart failed:', error);
      throw new CartOperationError(
        'Failed to remove item from cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, cartItems, setCartItems]);

  const validateCart = useCallback(async () => {
    if (!session?.user_alias) return;

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, releases(*)')
        .eq('user_alias', session.user_alias);

      if (error) throw error;

      console.log('[CART] Cart validated:', data);
      setCartItems(data || []);
    } catch (error) {
      console.error('[CART] Cart validation failed:', error);
      throw new CartOperationError(
        'Failed to validate cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, setCartItems]);

  return {
    items: cartItems,
    addToCart,
    removeFromCart,
    validateCart,
    isEmpty: cartItems.length === 0
  };
}