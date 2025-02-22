import { useState, useEffect } from 'react';
import { useSession } from './use-session';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { QUEUE_LIMITS } from '@/lib/constants';
import type { QueuePosition } from '@/types/database';

export function useQueue(recordId: number) {
  const [position, setPosition] = useState<number | null>(null);
  const [lastPosition, setLastPosition] = useState<number | null>(null);
  const { session } = useSession();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!session?.user_alias) return;

    const fetchPosition = async () => {
      const { data } = await supabase
        .from('reservation_queue')
        .select('queue_position')
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias)
        .single();

      const newPosition = data?.queue_position || null;
      
      if (position !== null && newPosition !== position) {
        console.log('[QUEUE] Position changed:', { old: position, new: newPosition });
        setLastPosition(position);
      }
      
      setPosition(newPosition);
    };

    fetchPosition();

    const subscription = supabase
      .channel(`queue-${recordId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_queue',
          filter: `release_id=eq.${recordId}`
        },
        () => {
          console.log('[QUEUE] Queue change detected');
          fetchPosition();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [recordId, session?.user_alias]);

  // Get next available queue position
  const getNextPosition = async (): Promise<number> => {
    const { data } = await supabase
      .from('reservation_queue')
      .select('queue_position')
      .eq('release_id', recordId)
      .order('queue_position', { ascending: false })
      .limit(1);

    return (data?.[0]?.queue_position || 0) + 1;
  };

  // Join queue for item
  const joinQueue = async (): Promise<boolean> => {
    if (!session?.user_alias) return false;

    try {
      // Check queue size
      const { count } = await supabase
        .from('reservation_queue')
        .select('*', { count: 'exact' })
        .eq('release_id', recordId);

      if (count && count >= QUEUE_LIMITS.MAX_SIZE) {
        throw new Error('Queue is full');
      }

      const nextPosition = await getNextPosition();
      
      const { error } = await supabase
        .from('reservation_queue')
        .insert({
          release_id: recordId,
          user_alias: session.user_alias,
          queue_position: nextPosition
        });

      if (error) throw error;
      
      console.log('[QUEUE] Successfully joined queue at position:', nextPosition);
      return true;
    } catch (error) {
      console.error('[QUEUE] Failed to join queue:', error);
      return false;
    }
  };

  return {
    position,
    lastPosition,
    hasChangedPosition: lastPosition !== null && position !== lastPosition,
    joinQueue
  };
}