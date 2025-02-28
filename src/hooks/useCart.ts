import { useCallback, useEffect, useState, useRef } from 'react';

// Add TypeScript declaration for window.cartCache
declare global {
  interface Window {
    cartCache?: {
      items: any[];
      userAlias: string | null;
      lastLoaded: number | null;
      isLoading: boolean;
    };
  }
}

// Module-level cache to prevent redundant loading
let cartCache = {
  items: [],
  userAlias: null,
  lastLoaded: null,
  isLoading: false
};

// Make cartCache accessible globally for direct resets
if (typeof window !== 'undefined') {
  window.cartCache = cartCache;
}
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useStore, useSession } from '@/store';
import { CartOperationError } from '@/lib/errors';
import { useGlobalStatus } from '@/hooks/useGlobalStatus';
import type { CartItem, RecordStatus } from '@/types/database';

export function useCart() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const cartItems = useStore(state => state.cartItems);
  const setCartItems = useStore(state => state.setCartItems);
  const { refreshSingleStatus } = useGlobalStatus();
  const [lastValidated, setLastValidated] = useState<Date | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Get status update function from the store
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);
  const recordStatuses = useStore(state => state.recordStatuses);

  // Track mounted state to prevent updates after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Background validation
  useEffect(() => {
    if (!session?.user_alias) return;

    // Check if we already have cached cart data for this user
    const cacheIsValid = 
      cartCache.userAlias === session.user_alias && 
      cartCache.lastLoaded && 
      (Date.now() - cartCache.lastLoaded) < 120000; // 2 minute cache
    
    if (cacheIsValid && cartCache.items.length > 0) {
      console.log('[CART] Using cached cart data');
      setCartItems(cartCache.items);
      setLastValidated(new Date(cartCache.lastLoaded));
      return;
    }
    
    console.log('[CART] Starting background validation');
    
    // Initial validation
    if (!cartCache.isLoading) {
      validateCart().then(() => {
        if (isMounted.current) {
          setLastValidated(new Date());
        }
      });
    }

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
    if (!session?.user_alias) {
      console.log('[CART] No session, skipping validation');
      return;
    }
    
    // Prevent duplicate in-flight requests
    if (cartCache.isLoading) {
      console.log('[CART] Validation already in progress, skipping');
      return;
    }

    setIsValidating(true);
    cartCache.isLoading = true;
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
      
      // Update both local cache and global window reference
      cartCache = {
        items: updatedItems,
        userAlias: session.user_alias,
        lastLoaded: Date.now(),
        isLoading: false
      };
      
      if (window) {
        window.cartCache = cartCache;
      }
      
      console.log(`[CART] Updated cart cache with ${updatedItems.length} items`);
      
      if (isMounted.current) {
        setCartItems(updatedItems);
        setLastValidated(new Date());
      }
    } catch (error) {
      console.error('[CART] Cart validation failed:', error);
      throw new CartOperationError(
        'Failed to validate cart',
        'VALIDATION',
        error
      );
    } finally {
      cartCache.isLoading = false;
      if (isMounted.current) {
        setIsValidating(false);
      }
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
      
      // Get current status from store
      const currentStatus = recordStatuses[recordId] || {
        cartStatus: 'AVAILABLE',
        reservation: null,
        lastValidated: new Date().toISOString()
      };
      
      // Immediately update status to show item is in cart
      updateRecordStatuses({
        [recordId]: {
          ...currentStatus,
          cartStatus: 'IN_CART',
          inCart: true,
          lastValidated: new Date().toISOString()
        }
      });

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

      if (error) {
        // If DB operation failed, revert the optimistic update
        updateRecordStatuses({
          [recordId]: currentStatus
        });
        throw error;
      }

      // Get release data
      const { data: release, error: releaseError } = await supabase
        .from('releases')
        .select('id, title, price, artists, labels, thumb, primary_image')
        .eq('id', recordId)
        .single();

      if (releaseError) {
        // We won't revert the status here since the item is in the cart,
        // but we might not have all the release details
        throw releaseError;
      }

      // Update single status through API to ensure consistency
      // This is still valuable as it will update any other status information
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
  }, [session?.user_alias, cartItems, setCartItems, refreshSingleStatus, recordStatuses, updateRecordStatuses]);

  const removeFromCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      // Get current status from store before removal
      const currentStatus = recordStatuses[recordId];
      
      if (currentStatus) {
        // Immediately update status to reflect item removal from cart
        updateRecordStatuses({
          [recordId]: {
            ...currentStatus,
            cartStatus: currentStatus.queuePosition ? 'IN_QUEUE' : 
                       (currentStatus.reservation ? 
                        (currentStatus.reservation.user_alias === session.user_alias ? 
                         'RESERVED' : 'RESERVED_BY_OTHERS') : 
                        'AVAILABLE'),
            inCart: false,
            lastValidated: new Date().toISOString()
          }
        });
      }

      // Remove from database
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias);

      if (error) {
        // If removal failed, revert the status update
        if (currentStatus) {
          updateRecordStatuses({
            [recordId]: currentStatus
          });
        }
        throw error;
      }

      console.log('[CART] Removed from cart:', recordId);
      
      // Update the status after removal to ensure API consistency
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
  }, [session?.user_alias, cartItems, setCartItems, refreshSingleStatus, recordStatuses, updateRecordStatuses]);

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