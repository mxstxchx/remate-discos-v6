import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { debounce } from 'lodash';

const statusCache = new Map();

export function useRecordStatus(recordId: number) {
  const [status, setStatus] = useState(() => statusCache.get(recordId) || null);
  const supabase = createClientComponentClient();
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('status, user_alias')
          .eq('release_id', recordId)
          .single();

        if (error) throw error;

        const newStatus = data
          ? { type: data.status, reservedBy: data.user_alias }
          : { type: 'AVAILABLE' };

        if (isMounted.current) {
          setStatus(newStatus);
          statusCache.set(recordId, newStatus);
        }
      } catch (err) {
        console.error(`[APP:recordStatus] Error fetching status for ${recordId}:`, err);
      }
    };

    // Debounced status update
    const debouncedFetch = debounce(fetchStatus, 300);

    // Initial fetch
    debouncedFetch();

    // Subscribe to changes
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
        debouncedFetch
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      debouncedFetch.cancel();
    };
  }, [recordId, supabase]);

  return status;
}