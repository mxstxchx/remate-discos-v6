import { useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useStore, useSession, useStatusLastFetched } from '@/store';
import type { RecordStatus } from '@/types/database';

export function useRecordStatuses() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const lastFetched = useStatusLastFetched();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);

  const fetchAllStatuses = useCallback(async () => {
    if (!session?.user_alias) return;

    try {
      // Only fetch non-default statuses
      const [reservations, queuePositions] = await Promise.all([
        supabase
          .from('reservations')
          .select('release_id, status, user_alias')
          .eq('status', 'RESERVED'),
          
        supabase
          .from('reservation_queue')
          .select('release_id, queue_position')
          .eq('user_alias', session.user_alias)
      ]);

      const statuses: Record<number, RecordStatus> = {};
      
      // Process reservations
      reservations.data?.forEach(reservation => {
        statuses[reservation.release_id] = {
          cartStatus: reservation.user_alias === session.user_alias
            ? 'RESERVED'
            : 'RESERVED_BY_OTHERS',
          reservation: {
            status: reservation.status,
            user_alias: reservation.user_alias
          },
          lastValidated: new Date().toISOString()
        };
      });

      // Process queue positions
      queuePositions.data?.forEach(queue => {
        statuses[queue.release_id] = {
          ...statuses[queue.release_id] || {
            cartStatus: 'IN_QUEUE',
            reservation: null,
            lastValidated: new Date().toISOString()
          },
          queuePosition: queue.queue_position
        };
      });

      console.log('[STATUS] Status updates:', statuses);
      updateRecordStatuses(statuses);
    } catch (error) {
      console.error('[STATUS] Error fetching statuses:', error);
    }
  }, [session?.user_alias]);

  // Initial fetch
  useEffect(() => {
    if (!lastFetched) {
      fetchAllStatuses();
    }
  }, [lastFetched, fetchAllStatuses]);

  // Set up real-time subscriptions
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
        () => {
          console.log('[STATUS] Reservation change detected');
          fetchAllStatuses();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_queue',
          filter: `user_alias=eq.${session.user_alias}`
        },
        () => {
          console.log('[STATUS] Queue position change detected');
          fetchAllStatuses();
        }
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