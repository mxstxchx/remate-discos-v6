import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession, useStore } from '@/store';
import { useCart } from '@/hooks/useCart';
import { CART_CONFIG } from '@/lib/constants';
import { CheckoutError } from '@/lib/errors';
import type { CartItem, Reservation } from '@/types/database';

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();
  const session = useSession();
  const { items, validateCart } = useCart();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);

  const createReservations = async (items: CartItem[]): Promise<Reservation[]> => {
    const now = new Date();
    const expiresAt = new Date(now.setDate(now.getDate() + 7)); // 7 days from now

    // Create all reservations in a single transaction
    const { data: reservations, error } = await supabase
      .from('reservations')
      .insert(
        items.map(item => ({
          release_id: item.release_id,
          user_alias: session?.user_alias,
          status: 'RESERVED',
          expires_at: expiresAt.toISOString()
        }))
      )
      .select();

    if (error) throw error;
    return reservations || [];
  };

  const joinQueue = async (recordId: number) => {
    const { data: queueSize } = await supabase
      .from('reservation_queue')
      .select('*', { count: 'exact' })
      .eq('release_id', recordId);

    if (queueSize && queueSize >= 20) {
      throw new Error('Queue is full');
    }

    await supabase
      .from('reservation_queue')
      .insert({
        release_id: recordId,
        user_alias: session?.user_alias
      });
  };

  const formatMessage = (items: CartItem[], truncate = false) => {
    const formattedItems = items
      .map(item => {
        if (truncate) {
          return `- [${item.releases.labels[0]?.catno}] (${item.releases.price}€)`;
        }
        return `- ${item.releases.title} [${item.releases.labels[0]?.catno}] (${item.releases.price}€)`;
      })
      .join('\n');

    const total = items.reduce((sum, item) => sum + item.releases.price, 0);

    return `Hi! I would like to pick up:
${formattedItems}
Total: ${total}€
Alias: ${session?.user_alias}`;
  };

  const handleCheckout = useCallback(async () => {
    if (!session?.user_alias || items.length === 0) return;

    setIsLoading(true);
    try {
      // Final validation check
      const { data: reservations } = await supabase
        .from('reservations')
        .select('release_id, user_alias')
        .in('release_id', items.map(i => i.release_id))
        .eq('status', 'RESERVED');

      // Find conflicts
      const conflicts = items.filter(item =>
        reservations?.some(r => r.release_id === item.release_id)
      );

      if (conflicts.length > 0) {
        // Prompt user about joining queue
        const shouldQueue = window.confirm(
          'Some items are no longer available. Would you like to join the queue for these items?'
        );

        if (shouldQueue) {
          // Add to queue
          await Promise.all(
            conflicts.map(item => joinQueue(item.release_id))
          );
        }

        throw new CheckoutError(
          'Some items were recently reserved',
          conflicts
        );
      }

      // Create reservations
      const newReservations = await createReservations(items);
      console.log('[CHECKOUT] Reservations created:', newReservations);

      // Update record statuses to reflect new reservations
      const statusUpdates = newReservations.reduce((acc, reservation) => {
        acc[reservation.release_id] = {
          cartStatus: 'RESERVED',
          reservation: {
            status: 'RESERVED',
            user_alias: session.user_alias
          },
          lastValidated: new Date().toISOString()
        };
        return acc;
      }, {} as Record<number, any>);

      updateRecordStatuses(statusUpdates);

      // Format message
      let message = formatMessage(items);
      if (message.length > CART_CONFIG.WHATSAPP_MESSAGE_LIMIT) {
        message = formatMessage(items, true);
      }

      // Try WhatsApp first, fallback to email
      try {
        window.open(
          `https://wa.me/${CART_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
        );
      } catch {
        window.location.href =
          `mailto:${CART_CONFIG.SUPPORT_EMAIL}?subject=Record%20Reservation&body=${encodeURIComponent(message)}`;
      }

      // Clear cart since items are now reserved
      await validateCart();
    } catch (error) {
      console.error('[CHECKOUT] Error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [items, session?.user_alias, updateRecordStatuses]);

  return {
    handleCheckout,
    isLoading
  };
}