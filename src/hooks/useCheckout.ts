import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession } from '@/store';
import { useCart } from '@/hooks/useCart';
import { CART_CONFIG } from '@/lib/constants';
import { CheckoutError } from '@/lib/errors';
import type { CartItem } from '@/types/database';

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();
  const session = useSession();
  const { items, validateCart } = useCart();

  const joinQueue = async (recordId: number) => {
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

    console.log('[CHECKOUT] Joining queue for record:', recordId);

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
        queue_position: nextPosition
      });

    if (insertError) {
      console.log('[CHECKOUT] Failed to join queue:', { recordId, error: insertError });
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

      // Handle conflicts first
      if (conflicts.length > 0) {
        const shouldQueue = window.confirm(
          'Some items are no longer available. Would you like to join the queue for these items?'
        );

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
        // Create reservation with proper expiry date
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(now.getDate() + 7);  // 7 days from now

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

      // Format message for WhatsApp
      const message = formatWhatsAppMessage(items, session.user_alias);
      window.open(
        `https://wa.me/${CART_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
        '_blank'
      );

      await validateCart();

      if (conflicts.length > 0) {
        throw new CheckoutError(
          'Some items were recently reserved',
          conflicts.map(({ item }) => ({
            release_id: item.release_id,
            title: item.releases.title
          }))
        );
      }
    } catch (error) {
      console.error('[CHECKOUT] Error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [items, session?.user_alias, supabase, validateCart]);

  return {
    handleCheckout,
    isLoading
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