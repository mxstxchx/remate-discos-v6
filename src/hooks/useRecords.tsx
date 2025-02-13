import { useEffect } from 'react';
import { useStore } from '@/store';
import { ITEMS_PER_PAGE } from '@/store/recordsSlice';
import { sqlToRest, postgrestRequest } from '@/lib/api';

const APP_LOG = '[APP:records]';
const DEV_LOG = '[DEV:records]';

export function useRecords(page: number = 1) {
  const { 
    releases,
    setReleases,
    setLoading,
    setError,
    setTotalPages 
  } = useStore();

  useEffect(() => {
    async function fetchReleases() {
      console.log(`${APP_LOG} Fetching records page ${page}`);
      setLoading(true);
      
      try {
        const { method, path } = await sqlToRest({
          sql: `
            SELECT 
              id, title, artists, labels, styles,
              year, country, condition, price,
              thumb, primary_image, secondary_image
            FROM releases
            ORDER BY created_at DESC
            LIMIT ${ITEMS_PER_PAGE}
            OFFSET ${(page - 1) * ITEMS_PER_PAGE}
          `
        });

        console.log(`${DEV_LOG} PostgREST query:`, { method, path });

        const { data: records } = await postgrestRequest({
          method,
          path
        });

        console.log(`${APP_LOG} Retrieved ${records.length} records`);

        const { method: countMethod, path: countPath } = await sqlToRest({
          sql: 'SELECT COUNT(*) FROM releases'
        });

        const { data: countData } = await postgrestRequest({
          method: countMethod,
          path: countPath
        });

        const total = parseInt(countData[0].count);
        console.log(`${APP_LOG} Total records: ${total}`);
        
        const parsedRecords = records.map(record => {
          try {
            return {
              ...record,
              artists: JSON.parse(record.artists),
              labels: JSON.parse(record.labels),
              styles: JSON.parse(record.styles)
            };
          } catch (err) {
            console.error(`${APP_LOG} Error parsing record ${record.id}:`, err);
            // Return record with empty arrays as fallback
            return {
              ...record,
              artists: [],
              labels: [],
              styles: []
            };
          }
        });
        
        setReleases(parsedRecords);
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
        setError(null);
      } catch (err) {
        console.error(`${APP_LOG} Error fetching records:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch records');
      } finally {
        setLoading(false);
      }
    }

    fetchReleases();
  }, [page, setReleases, setLoading, setError, setTotalPages]);

  return {
    releases,
    loading: useStore(state => state.loading),
    error: useStore(state => state.error),
    totalPages: useStore(state => state.totalPages)
  };
}