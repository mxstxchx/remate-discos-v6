import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { debounce } from 'lodash';

// Define status types for better type safety
export type RecordStatus = {
  type: 'AVAILABLE' | 'RESERVED' | 'IN_QUEUE';
  reservedBy?: string;
};

const statusCache = new Map<number, RecordStatus>();

const DEFAULT_STATUS: RecordStatus = {
  type: 'AVAILABLE'
};

export function useRecordStatus(recordId: number) {
  const [status, setStatus] = useState<RecordStatus>(() =>
    statusCache.get(recordId) || DEFAULT_STATUS
  );
  
  const supabase = createClientComponentClient();
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Only fetch active reservations (status = 'RESERVED')
        const { data, error } = await supabase
          .from('reservations')
          .select('status, user_alias')
          .eq('release_id', recordId)
          .eq('status', 'RESERVED')
          .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

        if (error) {
          // Only log real errors, not "no rows returned"
          if (error.code !== 'PGRST116') {
            console.error(`[APP:recordStatus] Error fetching status for ${recordId}:`, error);
          }
        }

        // If we have data, it means there's an active reservation
        const newStatus: RecordStatus = data
          ? { type: 'RESERVED', reservedBy: data.user_alias }
          : DEFAULT_STATUS;

        if (isMounted.current) {
          setStatus(newStatus);
          statusCache.set(recordId, newStatus);
        }
      } catch (err) {
        // In case of any error, default to AVAILABLE
        console.error(`[APP:recordStatus] Error fetching status for ${recordId}:`, err);
        if (isMounted.current) {
          setStatus(DEFAULT_STATUS);
          statusCache.set(recordId, DEFAULT_STATUS);
        }
      }
    };

    // Debounced status update
    const debouncedFetch = debounce(fetchStatus, 300);

    // Initial fetch
    debouncedFetch();

    // Subscribe to changes in reservations
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
        (payload) => {
          // Handle different types of changes
          if (payload.eventType === 'DELETE' ||
              (payload.eventType === 'UPDATE' && payload.new.status !== 'RESERVED')) {
            // If reservation is deleted or status changed from RESERVED
            if (isMounted.current) {
              const newStatus = DEFAULT_STATUS;
              setStatus(newStatus);
              statusCache.set(recordId, newStatus);
            }
          } else if (payload.eventType === 'INSERT' ||
                     (payload.eventType === 'UPDATE' && payload.new.status === 'RESERVED')) {
            // If new reservation is created or status changed to RESERVED
            if (isMounted.current) {
              const newStatus = {
                type: 'RESERVED',
                reservedBy: payload.new.user_alias
              };
              setStatus(newStatus);
              statusCache.set(recordId, newStatus);
            }
          }
        }
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