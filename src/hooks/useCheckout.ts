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

import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession, useStore } from '@/store';
import { useCart } from '@/hooks/useCart';
import { CART_CONFIG } from '@/lib/constants';
import { CheckoutError } from '@/lib/errors';
import type { CartItem } from '@/types/database';

interface CheckoutResult {
  success: boolean;
  hasConflicts: boolean;
  message: string;
  conflicts?: Array<{
    release_id: number;
    title: string;
  }>;
  reserved: Array<{
    release_id: number;
    title: string;
  }>;
}

export function useCheckout() {
 const [isLoading, setIsLoading] = useState(false);
 const [showModal, setShowModal] = useState(false);
 const [modalActions, setModalActions] = useState<{
   confirm: () => void;
   cancel: () => void;
 }>({ confirm: () => {}, cancel: () => {} });
 const [reservedItems, setReservedItems] = useState<Array<{
   release_id: number;
   title: string;
 }>>([]);

 const supabase = createClientComponentClient();
 const session = useSession();
 const { items, validateCart } = useCart();
 // Get direct access to setCartItems
 const setCartItems = useStore(state => state.setCartItems);

 const joinQueue = async (recordId: number) => {
   console.log('[CHECKOUT] Joining queue for record:', recordId);

   // Check if already in queue
   const { data: existingQueue } = await supabase
     .from('reservation_queue')
     .select('queue_position')
     .eq('release_id', recordId)
     .eq('user_alias', session?.user_alias)
     .single();

   if (existingQueue) {
     console.log('[CHECKOUT] Already in queue for:', recordId);
     return;
   }

   // Get current queue position
   const { data: queueItems, error: queueError } = await supabase
     .from('reservation_queue')
     .select('queue_position')
     .eq('release_id', recordId)
     .order('queue_position', { ascending: false })
     .limit(1);

   if (queueError) throw queueError;

   const nextPosition = queueItems?.length ? (queueItems[0].queue_position + 1) : 1;

   // Add to queue
   const { error: insertError } = await supabase
     .from('reservation_queue')
     .insert({
       release_id: recordId,
       user_alias: session?.user_alias,
       queue_position: nextPosition,
       joined_at: new Date().toISOString()
     });

   if (insertError) {
     console.error('[CHECKOUT] Failed to join queue:', { recordId, error: insertError });
     throw insertError;
   }

   console.log('[CHECKOUT] Joined queue:', { recordId, position: nextPosition });
 };

 const handleCheckout = useCallback(async () => {
   if (!session?.user_alias || items.length === 0) return;

   setIsLoading(true);
   try {
     console.log('[CHECKOUT] Starting checkout process');

     // Get current reservations
     const { data: reservations } = await supabase
       .from('reservations')
       .select('release_id, user_alias')
       .in('release_id', items.map(i => i.release_id))
       .eq('status', 'RESERVED');

     // Get current queue positions
     const { data: queuePositions } = await supabase
       .from('reservation_queue')
       .select('release_id, user_alias')
       .in('release_id', items.map(i => i.release_id))
       .eq('user_alias', session.user_alias);

     // Categorize items
     const itemStates = items.map(item => {
       const isReserved = reservations?.some(r => r.release_id === item.release_id);
       const inQueue = queuePositions?.some(q => q.release_id === item.release_id);
       return { item, isReserved, inQueue };
     });

     const conflicts = itemStates.filter(({ isReserved }) => isReserved);
     const availableItems = itemStates.filter(({ isReserved, inQueue }) => !isReserved && !inQueue)
       .map(({ item }) => item);

     console.log('[CHECKOUT] Item states:', {
       total: items.length,
       conflicts: conflicts.length,
       available: availableItems.length,
       inQueue: itemStates.filter(({ inQueue }) => inQueue).length
     });

     let shouldQueue = false;

     // Handle conflicts first
     if (conflicts.length > 0) {
       setReservedItems(conflicts.map(({ item }) => ({
         release_id: item.release_id,
         title: item.releases.title
       })));
       
       setShowModal(true);
       shouldQueue = await new Promise<boolean>((resolve) => {
         setModalActions({
           confirm: () => resolve(true),
           cancel: () => resolve(false)
         });
       });

       if (shouldQueue) {
         console.log('[CHECKOUT] Processing queue joins');
         for (const { item, inQueue } of conflicts) {
           if (!inQueue) {
             try {
               await joinQueue(item.release_id);
             } catch (error) {
               console.error('[CHECKOUT] Queue join failed:', { id: item.release_id, error });
             }
           } else {
             console.log('[CHECKOUT] Skipping queue join - already in queue:', item.release_id);
           }
         }
       }
     }

     // Handle available items
     if (availableItems.length > 0) {
       console.log('[CHECKOUT] Creating reservations:', availableItems.length);
       const now = new Date();
       const expiryDate = new Date(now);
       expiryDate.setDate(now.getDate() + 7);

       const { error: reservationError } = await supabase
         .from('reservations')
         .insert(
           availableItems.map(item => ({
             release_id: item.release_id,
             user_alias: session.user_alias,
             status: 'RESERVED',
             reserved_at: now.toISOString(),
             expires_at: expiryDate.toISOString()
           }))
         );

       if (reservationError) {
         console.error('[CHECKOUT] Reservation failed:', {
           error: reservationError,
           items: availableItems.map(i => i.release_id)
         });
         throw new Error(`Failed to create reservations: ${reservationError.message}`);
       }

       console.log('[CHECKOUT] Reservations created successfully:', {
         count: availableItems.length,
         items: availableItems.map(i => i.release_id),
         expiresAt: expiryDate
       });
     }

     // Clean up cart items based on results
     console.log('[CHECKOUT] Preparing cart cleanup');
     
     const itemsToRemove = new Set(items.map(item => item.release_id));
     console.log('[CHECKOUT] Initial items to remove:', Array.from(itemsToRemove));

     // Process conflict resolutions
     if (conflicts.length > 0) {
       conflicts.forEach(({ item, inQueue }) => {
         if (!shouldQueue && !inQueue) {
           // Keep items in cart if user didn't want to join queue and wasn't already in queue
           itemsToRemove.delete(item.release_id);
           console.log('[CHECKOUT] Keeping in cart - no queue requested:', item.release_id);
         } else {
           console.log('[CHECKOUT] Removing from cart - queue joined or already in queue:', item.release_id);
         }
       });
     }

     const itemsArray = Array.from(itemsToRemove);
     if (itemsArray.length > 0) {
       console.log('[CHECKOUT] Removing from cart:', itemsArray);
       
       const { error: cleanupError } = await supabase
         .from('cart_items')
         .delete()
         .in('release_id', itemsArray)
         .eq('user_alias', session.user_alias);

       if (cleanupError) {
         console.error('[CHECKOUT] Cart cleanup failed:', {
           error: cleanupError,
           attempted: itemsArray
         });
       } else {
         console.log('[CHECKOUT] Cart cleanup successful:', {
           removedItems: itemsArray,
           shouldQueue,
           availableCount: availableItems.length,
           conflictCount: conflicts.length
         });
       }
     }

     // Clean up cart cache explicitly
     if (window && window.cartCache) {
       window.cartCache = {
         items: [],
         userAlias: session.user_alias,
         lastLoaded: Date.now(),
         isLoading: false
       };
     }
     
     await validateCart();
     
     // Force clear the cart in store directly
     setCartItems([]);
     
     // Add a small delay to ensure UI updates
     await new Promise(resolve => setTimeout(resolve, 100));

     // Format message for WhatsApp
     const message = formatWhatsAppMessage(items, session.user_alias);
     window.open(
       `https://wa.me/${CART_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
       '_blank'
     );

      // Handle results notification
      if (conflicts.length > 0) {
        // Return result object instead of throwing
        return {
          success: true,
          hasConflicts: true,
          message: 'Checkout completed with some items unavailable',
          conflicts: conflicts.map(({ item }) => ({
            release_id: item.release_id,
            title: item.releases.title
          })),
          reserved: availableItems.map(item => ({
            release_id: item.release_id,
            title: item.releases.title
          }))
        };
      }

      return {
        success: true,
        hasConflicts: false,
        message: 'Checkout completed successfully',
        reserved: availableItems.map(item => ({
          release_id: item.release_id,
          title: item.releases.title
        }))
      };
    } catch (error) {
      console.error('[CHECKOUT] Error:', error);
      return {
        success: false,
        hasConflicts: false,
        message: 'An error occurred during checkout',
        reserved: []
      };
   } finally {
     setIsLoading(false);
   }
 }, [items, session?.user_alias, supabase, validateCart]);

 return {
   handleCheckout,
   isLoading,
   showModal,
   setShowModal,
   modalActions,
   reservedItems
 };
}

function formatWhatsAppMessage(items: CartItem[], userAlias: string): string {
 const formattedItems = items
   .map(item => `- ${item.releases.title} [${item.releases.labels[0]?.catno}] (${item.releases.price}€)`)
   .join('\n');

 const total = items.reduce((sum, item) => sum + item.releases.price, 0);

 return `Hi! I would like to pick up:
${formattedItems}
Total: ${total}€
Alias: ${userAlias}`;
}