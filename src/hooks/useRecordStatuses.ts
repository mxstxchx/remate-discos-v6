import { useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession, useStore } from '@/store';
import type { RecordStatus } from '@/types/database';

export function useRecordStatuses() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);

  const fetchAllStatuses = useCallback(async () => {
    if (!session?.user_alias) return;

    try {
      // Get all statuses in one go
      const [reservations, queuePositions, cartItems] = await Promise.all([
        supabase
          .from('reservations')
          .select('release_id, status, user_alias')
          .eq('status', 'RESERVED'),
          
        supabase
          .from('reservation_queue')
          .select('release_id, queue_position')
          .eq('user_alias', session.user_alias),

        supabase
          .from('cart_items')
          .select('release_id')
          .eq('user_alias', session.user_alias)
      ]);

      // Create a map of statuses
      const statusMap: Record<number, RecordStatus> = {};

      // First, process cart items
      cartItems.data?.forEach(item => {
        statusMap[item.release_id] = {
          cartStatus: 'IN_CART',
          reservation: null,
          lastValidated: new Date().toISOString()
        };
      });

      // Then process reservations
      reservations.data?.forEach(reservation => {
        statusMap[reservation.release_id] = {
          ...statusMap[reservation.release_id],
          cartStatus: reservation.user_alias === session.user_alias ? 'RESERVED' : 'RESERVED_BY_OTHERS',
          reservation: {
            status: reservation.status,
            user_alias: reservation.user_alias
          },
          lastValidated: new Date().toISOString()
        };
      });

      // Finally process queue positions - this should override other statuses
      queuePositions.data?.forEach(queue => {
        statusMap[queue.release_id] = {
          cartStatus: 'IN_QUEUE',
          reservation: statusMap[queue.release_id]?.reservation || null,
          queuePosition: queue.queue_position,
          lastValidated: new Date().toISOString()
        };
      });

      console.log('[STATUS] Status updates:', statusMap);
      updateRecordStatuses(statusMap);
    } catch (error) {
      console.error('[STATUS] Error fetching statuses:', error);
    }
  }, [session?.user_alias, updateRecordStatuses]);

  // Initial fetch
  useEffect(() => {
    if (session?.user_alias) {
      fetchAllStatuses();
    }
  }, [session?.user_alias, fetchAllStatuses]);

  // Subscribe to changes
  useEffect(() => {
    if (!session?.user_alias) return;

    const subscription = supabase
      .channel('record-statuses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        () => fetchAllStatuses()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_queue'
        },
        () => fetchAllStatuses()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items'
        },
        () => fetchAllStatuses()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user_alias, fetchAllStatuses]);

  return {
    fetchAllStatuses
  };
}