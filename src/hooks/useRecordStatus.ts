import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { sqlToRest, postgrestRequest } from '@/lib/api';

const APP_LOG = '[APP:recordStatus]';

export type RecordStatus = {
  type: 'AVAILABLE' | 'RESERVED' | 'IN_QUEUE';
  lastChecked: string;
};

export function useRecordStatus(releaseId: number) {
  const [status, setStatus] = useState<RecordStatus | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { method, path } = await sqlToRest({
          sql: `
            SELECT 
              CASE
                WHEN r.status = 'RESERVED' THEN 'RESERVED'
                WHEN q.release_id IS NOT NULL THEN 'IN_QUEUE'
                ELSE 'AVAILABLE'
              END as type
            FROM releases rel
            LEFT JOIN reservations r ON rel.id = r.release_id
            LEFT JOIN reservation_queue q ON rel.id = q.release_id
            WHERE rel.id = ${releaseId}
          `
        });

        const { data } = await postgrestRequest({ method, path });
        
        if (data?.[0]) {
          console.log(`${APP_LOG} Status updated for ${releaseId}:`, data[0].type);
          setStatus({
            type: data[0].type,
            lastChecked: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error(`${APP_LOG} Error fetching status for ${releaseId}:`, err);
      }
    };

    fetchStatus();

    const statusSub = supabase
      .channel(`record-${releaseId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `release_id=eq.${releaseId}`
      }, () => {
        console.log(`${APP_LOG} Status change detected for ${releaseId}`);
        fetchStatus();
      })
      .subscribe();

    const validationInterval = setInterval(fetchStatus, 300000);

    return () => {
      statusSub.unsubscribe();
      clearInterval(validationInterval);
    };
  }, [releaseId]);

  return status;
}