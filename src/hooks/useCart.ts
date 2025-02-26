import { useCallback, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useStore, useSession } from '@/store';
import { CartOperationError } from '@/lib/errors';
import { useGlobalStatus } from '@/hooks/useGlobalStatus';
import type { CartItem } from '@/types/database';

export function useCart() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const cartItems = useStore(state => state.cartItems);
  const setCartItems = useStore(state => state.setCartItems);
  const { refreshSingleStatus } = useGlobalStatus();
  const [lastValidated, setLastValidated] = useState<Date | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Background validation
  useEffect(() => {
    if (!session?.user_alias) return;

    console.log('[CART] Starting background validation');
    
    // Initial validation
    validateCart().then(() => {
      setLastValidated(new Date());
    });

    // Set up interval - 5 minutes
    const interval = setInterval(async () => {
      console.log('[CART] Running scheduled validation, last validated:', lastValidated?.toISOString());
      
      try {
        await validateCart();
        setLastValidated(new Date());
      } catch (error) {
        console.error('[CART] Background validation failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    // Cleanup
    return () => {
      console.log('[CART] Cleaning up background validation');
      clearInterval(interval);
    };
  }, [session?.user_alias]); // Only re-run if user changes

  // Optimized cart validation that leverages our global status
  const validateCart = useCallback(async () => {
    if (!session?.user_alias || cartItems.length === 0) {
      console.log('[CART] No session or empty cart, skipping validation');
      return;
    }

    setIsValidating(true);
    try {
      console.log('[CART] Starting cart validation for:', session.user_alias);
      
      // Only fetch the cart items themselves, not the complete record data
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('release_id')
        .eq('user_alias', session.user_alias);

      if (cartError) throw cartError;

      // Use our efficient API endpoint to get all statuses at once
      const recordIds = cartData.map(item => item.release_id);
      
      // Get fresh release data for these cart items
      const { data: releases, error: releasesError } = await supabase
        .from('releases')
        .select('id, title, price, artists, labels, thumb, primary_image')
        .in('id', recordIds);

      if (releasesError) throw releasesError;
      
      // Prepare a map of releases for faster lookups
      const releaseMap = {};
      releases?.forEach(release => {
        releaseMap[release.id] = release;
      });

      // Get all status information for cart items in a single call
      const statusResponse = await fetch(`/api/status?user_alias=${encodeURIComponent(session.user_alias)}`);
      const { statusMap, error: statusError } = await statusResponse.json();
      
      if (statusError) throw new Error(statusError);
      
      // Convert the raw IDs to full cart items
      const updatedItems = cartData.map(item => {
        const status = statusMap[item.release_id];
        const release = releaseMap[item.release_id];
        
        return {
          id: crypto.randomUUID(),
          release_id: item.release_id,
          user_alias: session.user_alias,
          // Extract status information from our global status
          status: status?.cartStatus || 'AVAILABLE',
          queue_position: status?.queuePosition,
          last_validated_at: new Date().toISOString(),
          // Add release data
          releases: release
        };
      });
      
      console.log(`[CART] Validated ${updatedItems.length} cart items`);
      setCartItems(updatedItems);
      setLastValidated(new Date());
    } catch (error) {
      console.error('[CART] Cart validation failed:', error);
      throw new CartOperationError(
        'Failed to validate cart',
        'VALIDATION',
        error
      );
    } finally {
      setIsValidating(false);
    }
  }, [session?.user_alias, cartItems.length, setCartItems]);

  const addToCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      const existing = cartItems.find(item => item.release_id === recordId);
      if (existing) {
        console.log('[CART] Item already in cart:', recordId);
        return;
      }

      // Insert into cart_items - cart_item_validation trigger will handle status
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          release_id: recordId,
          user_alias: session.user_alias,
          status: 'AVAILABLE' // Initial status, trigger will validate
        })
        .select()
        .single();

      if (error) throw error;

      // Get release data
      const { data: release, error: releaseError } = await supabase
        .from('releases')
        .select('id, title, price, artists, labels, thumb, primary_image')
        .eq('id', recordId)
        .single();

      if (releaseError) throw releaseError;

      // Update single status - this is efficient because it only fetches one record
      await refreshSingleStatus(recordId);

      console.log('[CART] Added to cart:', {
        id: recordId,
        status: data.status
      });

      // Combine data and release for cart item
      const newCartItem = {
        ...data,
        releases: release
      };

      setCartItems([...cartItems, newCartItem]);
    } catch (error) {
      console.error('[CART] Add to cart failed:', error);
      throw new CartOperationError(
        'Failed to add item to cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, cartItems, setCartItems, refreshSingleStatus]);

  const removeFromCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias);

      console.log('[CART] Removed from cart:', recordId);
      
      // Update the status after removal to ensure UI is in sync
      await refreshSingleStatus(recordId);
      
      // Update cart items
      setCartItems(cartItems.filter(item => item.release_id !== recordId));
    } catch (error) {
      console.error('[CART] Remove from cart failed:', error);
      throw new CartOperationError(
        'Failed to remove item from cart',
        'VALIDATION',
        error
      );
    }
  }, [session?.user_alias, cartItems, setCartItems, refreshSingleStatus]);

  return {
    items: cartItems,
    addToCart,
    removeFromCart,
    validateCart,
    isEmpty: cartItems.length === 0,
    lastValidated,
    isValidating
  };
}