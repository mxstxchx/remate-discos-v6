import { useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession, useStore } from '@/store';

export function useQueue() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);

  const leaveQueue = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      const { error } = await supabase
        .from('reservation_queue')
        .delete()
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias);

      if (error) throw error;

      // Update status in store
      updateRecordStatuses({
        [recordId]: {
          cartStatus: 'AVAILABLE',
          reservation: null,
          queuePosition: undefined,
          lastValidated: new Date().toISOString()
        }
      });

      console.log('[QUEUE] Left queue for record:', recordId);
    } catch (error) {
      console.error('[QUEUE] Failed to leave queue:', error);
      throw error;
    }
  }, [session?.user_alias, updateRecordStatuses]);

  const joinQueue = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;

    try {
      // Check queue size
      const { count } = await supabase
        .from('reservation_queue')
        .select('*', { count: 'exact' })
        .eq('release_id', recordId);

      if (count && count >= 20) {
        throw new Error('Queue is full');
      }

      // Get next queue position
      const { data: currentQueue } = await supabase
        .from('reservation_queue')
        .select('queue_position')
        .eq('release_id', recordId)
        .order('queue_position', { ascending: false })
        .limit(1);

      const nextPosition = (currentQueue?.[0]?.queue_position || 0) + 1;

      // Join queue
      const { data, error } = await supabase
        .from('reservation_queue')
        .insert({
          release_id: recordId,
          user_alias: session.user_alias,
          queue_position: nextPosition
        })
        .select()
        .single();

      if (error) throw error;

      // Update status in store
      updateRecordStatuses({
        [recordId]: {
          cartStatus: 'IN_QUEUE',
          reservation: null,
          queuePosition: nextPosition,
          lastValidated: new Date().toISOString()
        }
      });

      console.log('[QUEUE] Joined queue:', data);
      return data;
    } catch (error) {
      console.error('[QUEUE] Failed to join queue:', error);
      throw error;
    }
  }, [session?.user_alias, updateRecordStatuses]);

  return { joinQueue, leaveQueue };
}