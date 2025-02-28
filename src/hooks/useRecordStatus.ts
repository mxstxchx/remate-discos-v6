import { useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession, useStore } from '@/store';
import type { RecordStatus } from '@/types/database';

export function useRecordStatus(recordId: number) {
  const supabase = createClientComponentClient();
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);
  const status = useStore(state => state.recordStatuses[recordId]);
  // Get cart items from the store
  const cartItems = useStore(state => state.cartItems);
  
  // Check if record is in cart
  const isInCart = useMemo(() => {
    return cartItems.some(item => item.release_id === recordId);
  }, [cartItems, recordId]);
  
  // Update status with cart info if needed
  useEffect(() => {
    if (status && isInCart && status.cartStatus !== 'IN_CART' && status.cartStatus !== 'IN_QUEUE') {
      console.log(`[STATUS_FIX] Record ${recordId} is in cart but status doesn't reflect it, updating status`);
      updateRecordStatuses({
        [recordId]: {
          ...status,
          cartStatus: 'IN_CART',
          inCart: true
        }
      });
    }
  }, [recordId, status, isInCart, updateRecordStatuses]);

  const fetchStatus = useCallback(async () => {
    if (!recordId || !session?.user_alias) return;

    try {
      // First check if record is sold
      const { data: release } = await supabase
        .from('releases')
        .select('sold_at, sold_by')
        .eq('id', recordId)
        .maybeSingle();

      if (release?.sold_at) {
        const newStatus: RecordStatus = {
          cartStatus: 'SOLD',
          reservation: null,
          soldAt: release.sold_at,
          soldBy: release.sold_by,
          lastValidated: new Date().toISOString()
        };
        updateRecordStatuses({
          [recordId]: newStatus
        });
        return;
      }

      // Get reservation status
      const { data: reservation } = await supabase
        .from('reservations')
        .select('status, user_alias')
        .eq('release_id', recordId)
        .eq('status', 'RESERVED')
        .maybeSingle();

      // Get queue position
      const { data: queuePosition } = await supabase
        .from('reservation_queue')
        .select('queue_position')
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias)
        .maybeSingle();

      // Check if the item is already in the cart for the user
      const isItemInCart = cartItems.some(item => item.release_id === recordId);

      const newStatus: RecordStatus = {
        cartStatus: queuePosition ? 'IN_QUEUE' :
                   isItemInCart ? 'IN_CART' :
                   (reservation ? (reservation.user_alias === session.user_alias ? 'RESERVED' : 'RESERVED_BY_OTHERS') :
                   'AVAILABLE'),
        reservation: reservation ? {
          status: reservation.status,
          user_alias: reservation.user_alias
        } : null,
        queuePosition: queuePosition?.queue_position,
        inCart: isItemInCart,
        lastValidated: new Date().toISOString()
      };

      console.log('[STATUS] Updated status for record:', recordId, newStatus);
      updateRecordStatuses({
        [recordId]: newStatus
      });
    } catch (error) {
      console.error('[STATUS] Error fetching status:', error);
    }
  }, [recordId, session?.user_alias, updateRecordStatuses, cartItems]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Subscribe to changes
  useEffect(() => {
    if (!recordId) return;

    const subscription = supabase
      .channel(`record-${recordId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'releases',
          filter: `id=eq.${recordId}`
        },
        () => fetchStatus()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `release_id=eq.${recordId}`
        },
        () => fetchStatus()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_queue',
          filter: `release_id=eq.${recordId}`
        },
        () => fetchStatus()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [recordId, fetchStatus]);

  return status;
}