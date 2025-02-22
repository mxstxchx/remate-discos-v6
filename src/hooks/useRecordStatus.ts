import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession } from '@/store';
import type { RecordStatus } from '@/types/database';

export function useRecordStatus(recordId: number) {
  const [status, setStatus] = useState<RecordStatus | null>(null);
  const supabase = createClientComponentClient();
  const session = useSession();

  const fetchStatus = async () => {
    if (!recordId || !session?.user_alias) return;

    try {
      const [reservations, cartItems, queuePositions] = await Promise.all([
        supabase
          .from('reservations')
          .select('release_id, status, user_alias')
          .eq('release_id', recordId)
          .eq('status', 'RESERVED')
          .maybeSingle(),
          
        supabase
          .from('cart_items')
          .select('release_id, status, last_validated_at')
          .eq('release_id', recordId)
          .eq('user_alias', session.user_alias)
          .maybeSingle(),
          
        supabase
          .from('reservation_queue')
          .select('release_id, queue_position')
          .eq('release_id', recordId)
          .eq('user_alias', session.user_alias)
          .maybeSingle()
      ]);

      const newStatus: RecordStatus = {
        cartStatus: cartItems.data?.status || 'AVAILABLE',
        reservation: reservations.data ? {
          status: reservations.data.status,
          user_alias: reservations.data.user_alias
        } : null,
        queuePosition: queuePositions.data?.queue_position,
        lastValidated: cartItems.data?.last_validated_at || new Date().toISOString()
      };

      console.log('[STATUS] Status updated for record:', recordId, newStatus);
      setStatus(newStatus);
    } catch (error) {
      console.error('[STATUS] Error fetching status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();

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
        () => {
          console.log('[STATUS] Reservation change detected');
          fetchStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `release_id=eq.${recordId}`
        },
        () => {
          console.log('[STATUS] Cart item change detected');
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [recordId, session?.user_alias]);

  return status;
}