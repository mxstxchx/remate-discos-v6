import { useTranslation } from 'react-i18next';

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

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
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
    price?: number;
  }>;
  soldItems?: Array<{
    release_id: number;
    title: string;
    price?: number;
  }>;
  reserved: Array<{
    release_id: number;
    title: string;
  }>;
}

export function useCheckout() {
  const { t } = useTranslation('checkout');
  const [isLoading, setIsLoading] = useState(false);
 const [showModal, setShowModal] = useState(false);
 const [showSuccessModal, setShowSuccessModal] = useState(false);

 // Debug success modal state changes
 useEffect(() => {
   console.log('[CHECKOUT] showSuccessModal state changed:', showSuccessModal);
 }, [showSuccessModal]);
 const [modalActions, setModalActions] = useState<{
   confirm: () => void;
   cancel: () => void;
 }>({ confirm: () => {}, cancel: () => {} });
 const [reservedItems, setReservedItems] = useState<Array<{
   release_id: number;
   title: string;
   price: number;
 }>>([]);
 const [queuedItems, setQueuedItems] = useState<Array<{
   release_id: number;
   title: string;
 }>>([]);

 // Using the singleton supabase client from client.ts
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
       
     // Check for sold releases
     const { data: soldReleases } = await supabase
       .from('releases')
       .select('id, sold_at')
       .in('id', items.map(i => i.release_id))
       .not('sold_at', 'is', null);
     
     console.log('[CHECKOUT] Sold releases check:', soldReleases);

     // Categorize items
     const itemStates = items.map(item => {
       const isReserved = reservations?.some(r => r.release_id === item.release_id);
       const inQueue = queuePositions?.some(q => q.release_id === item.release_id);
       const isSold = soldReleases?.some(r => r.id === item.release_id);
       return { item, isReserved, inQueue, isSold };
     });

     // Items with conflicts (already reserved or sold)
     const conflicts = itemStates.filter(({ isReserved, isSold }) => isReserved || isSold);
     
     // Only truly available items (not reserved, not sold, not in queue)
     const availableItems = itemStates.filter(({ isReserved, inQueue, isSold }) => 
       !isReserved && !inQueue && !isSold
     ).map(({ item }) => item);

     // Calculate sold items separately for reporting
     const soldItems = itemStates.filter(({ isSold }) => isSold);
     
     console.log('[CHECKOUT] Item states:', {
       total: items.length,
       conflicts: conflicts.length,
       available: availableItems.length,
       inQueue: itemStates.filter(({ inQueue }) => inQueue).length,
       sold: soldItems.length
     });

     let shouldQueue = false;
     
     // Separate reserved items from sold items
     const reservedByOthers = conflicts.filter(({ isReserved, isSold }) => isReserved && !isSold);
     
     // Handle conflicts first (only for items that are reserved but not sold)
     if (reservedByOthers.length > 0) {
       setReservedItems(reservedByOthers.map(({ item }) => ({
         release_id: item.release_id,
         title: item.releases.title,
         price: item.releases?.price || 0
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
         for (const { item, inQueue, isSold } of reservedByOthers) {
           // Skip sold items - they can't be queued
           if (isSold) {
             console.log('[CHECKOUT] Skipping queue join - item is sold:', item.release_id);
             continue;
           }
           
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
     
     // First show the success modal
     if (availableItems.length > 0) {
       // Debug log for available items
       console.log('[CHECKOUT] Available items for reservation:', availableItems.map(item => ({
         id: item.release_id,
         title: item.releases?.title,
         price: item.releases?.price,
         hasReleases: !!item.releases
       })));

       setReservedItems(availableItems.map(item => ({
         release_id: item.release_id,
         title: item.releases?.title || `Record #${item.release_id}`,
         price: item.releases?.price || 0
       })));
       
       // Save queued items separately if user chose to join queue
       if (shouldQueue) {
         // Filter out sold items from the queue list
         setQueuedItems(reservedByOthers
           .filter(({ isSold }) => !isSold)
           .map(({ item }) => ({
             release_id: item.release_id,
             title: item.releases?.title || `Record #${item.release_id}`
           }))
         );
       }
       
       // Show success modal before clearing cart
       setShowSuccessModal(true);
       console.log('[CHECKOUT] Set showSuccessModal to true');
       
       // Delay cart clearing slightly to ensure modal shows
       setTimeout(() => {
         // Force clear the cart in store directly
         setCartItems([]);
         console.log('[CHECKOUT] Cleared cart items with delay');
       }, 100);
     } else {
       // No reservations, just clear cart
       setCartItems([]);
     }
     
     // No immediate WhatsApp trigger - user will use modal buttons

      // Handle results notification
      if (conflicts.length > 0) {
        // Calculate reserved conflicts (exclude sold items)
        const reservableConflicts = conflicts
          .filter(({ isSold }) => !isSold)
          .map(({ item }) => ({
            release_id: item.release_id,
            title: item.releases.title,
            price: item.releases?.price || 0
          }));
          
        // Get sold items for reporting
        const soldItemsInfo = soldItems.map(({ item }) => ({
          release_id: item.release_id,
          title: item.releases.title,
          price: item.releases?.price || 0
        }));
        
        console.log('[CHECKOUT] Sold items not included in queue:', soldItemsInfo);
          
        // Return result object with both types of conflicts
        return {
          success: true,
          hasConflicts: true,
          message: 'Checkout completed with some items unavailable',
          conflicts: reservableConflicts,
          soldItems: soldItemsInfo,
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

 // Create contact methods with language awareness
 const handleWhatsAppContact = useCallback(() => {
   const message = formatWhatsAppMessage(reservedItems, session?.user_alias || 'Guest', session?.language || 'en', t);
   window.open(`https://wa.me/${CART_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
 }, [reservedItems, session?.user_alias, session?.language, t]);

 const handleEmailContact = useCallback(() => {
   // Create subject from translation
   const subject = t('messages.email_subject', { alias: session?.user_alias || 'Guest' });
   
   // Create body with translation function
   const body = formatEmailMessage(reservedItems, session?.user_alias || 'Guest', session?.language || 'en', t); 
   window.open(`mailto:${CART_CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
 }, [reservedItems, session?.user_alias, session?.language, t]);
 
 return {
   handleCheckout,
   isLoading,
   showModal,
   setShowModal,
   showSuccessModal,
   setShowSuccessModal,
   modalActions,
   reservedItems,
   queuedItems,
   handleWhatsAppContact,
   handleEmailContact
 };
}

// Format WhatsApp message for contact based on language
function formatWhatsAppMessage(
  reservedItems: Array<{ release_id: number, title: string, price: number }>, 
  userAlias: string,
  language: string = 'en',
  t: any // Pass translation function
): string {
 const formattedItems = reservedItems
   .map(item => `- ${item.title || `Record #${item.release_id}`} (${item.price || 0}€)`)
   .join('\n');

 const total = reservedItems.reduce((sum, item) => sum + (item.price || 0), 0);

 // Use the translation template directly
 const template = t('messages.whatsapp');
 
 return template
   .replace('{{items}}', formattedItems)
   .replace('{{total}}', total.toString())
   .replace('{{alias}}', userAlias);
}

// Format email message for contact based on language
function formatEmailMessage(
  reservedItems: Array<{ release_id: number, title: string, price: number }>, 
  userAlias: string,
  language: string = 'en',
  t: any // Pass translation function
): string {
 const formattedItems = reservedItems
   .map(item => `- ${item.title || `Record #${item.release_id}`} (${item.price || 0}€)`)
   .join('\n');

 const total = reservedItems.reduce((sum, item) => sum + (item.price || 0), 0);
 
 // Format date according to locale
 const date = new Date().toLocaleDateString(
   language === 'es' ? 'es-ES' : 'en-US',
   { year: 'numeric', month: 'long', day: 'numeric' }
 );

 // Use the translation template directly
 const template = t('messages.email_body');

 return template
   .replace('{{items}}', formattedItems)
   .replace('{{total}}', total.toString())
   .replace('{{date}}', date)
   .replace('{{alias}}', userAlias);
}