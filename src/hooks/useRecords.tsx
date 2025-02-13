import { useEffect } from 'react';
import { useStore } from '@/store';
import { ITEMS_PER_PAGE } from '@/store/recordsSlice';
import { sqlToRest, postgrestRequest } from '@/lib/api';

const APP_LOG = '[APP:records]';

export function useRecords(page: number = 1) {
  const releases = useStore(state => state.releases);
  const setReleases = useStore(state => state.setReleases);
  const setLoading = useStore(state => state.setLoading);
  const setError = useStore(state => state.setError);
  const setTotalPages = useStore(state => state.setTotalPages);
  const loading = useStore(state => state.loading);
  const error = useStore(state => state.error);
  const totalPages = useStore(state => state.totalPages);

  useEffect(() => {
    async function fetchReleases() {
      setLoading(true);
      
      try {
        // Fetch releases
        const { method, path } = await sqlToRest({
          sql: `SELECT * FROM releases ORDER BY created_at DESC LIMIT ${ITEMS_PER_PAGE} OFFSET ${(page - 1) * ITEMS_PER_PAGE}`
        });

        const records = await postgrestRequest({ method, path });
        console.log(`${APP_LOG} Fetched records:`, records?.length);

        if (records?.length) {
          const parsedRecords = records.map(record => ({
            ...record,
            artists: typeof record.artists === 'string' ? JSON.parse(record.artists) : record.artists,
            labels: typeof record.labels === 'string' ? JSON.parse(record.labels) : record.labels,
            styles: typeof record.styles === 'string' ? JSON.parse(record.styles) : record.styles
          }));
          
          setReleases(parsedRecords);
        }

        // Fetch count
        const { method: countMethod, path: countPath } = await sqlToRest({
          sql: 'SELECT COUNT(*) FROM releases'
        });

        const countResult = await postgrestRequest({
          method: countMethod,
          path: countPath
        });

        if (countResult?.[0]?.count) {
          setTotalPages(Math.ceil(parseInt(countResult[0].count) / ITEMS_PER_PAGE));
        }

        setError(null);
      } catch (err) {
        console.error(`${APP_LOG} Error:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch records');
      } finally {
        setLoading(false);
      }
    }

    fetchReleases();
  }, [page, setReleases, setLoading, setError, setTotalPages]);

  return { releases, loading, error, totalPages };
}