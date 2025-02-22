import { useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession, useStore } from '@/store';
import type { RecordStatus } from '@/types/database';

export function useRecordStatus(recordId: number) {
  const supabase = createClientComponentClient();
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);
  const status = useStore(state => state.recordStatuses[recordId]);

  const fetchStatus = useCallback(async () => {
    if (!recordId || !session?.user_alias) return;

    try {
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

      const newStatus: RecordStatus = {
        cartStatus: queuePosition ? 'IN_QUEUE' :
                   (reservation ? (reservation.user_alias === session.user_alias ? 'RESERVED' : 'RESERVED_BY_OTHERS') :
                   'AVAILABLE'),
        reservation: reservation ? {
          status: reservation.status,
          user_alias: reservation.user_alias
        } : null,
        queuePosition: queuePosition?.queue_position,
        lastValidated: new Date().toISOString()
      };

      console.log('[STATUS] Updated status for record:', recordId, newStatus);
      updateRecordStatuses({
        [recordId]: newStatus
      });
    } catch (error) {
      console.error('[STATUS] Error fetching status:', error);
    }
  }, [recordId, session?.user_alias, updateRecordStatuses]);

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