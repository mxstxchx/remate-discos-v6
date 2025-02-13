import { useEffect } from 'react';
import { useStore } from '@/store';
import { ITEMS_PER_PAGE } from '@/store/recordsSlice';
import { sqlToRest, postgrestRequest } from '@/lib/api';

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
      setLoading(true);
      try {
        // Convert SQL to PostgREST query
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

        // Fetch records
        const { data: records } = await postgrestRequest({
          method,
          path
        });

        // Get total count for pagination
        const { method: countMethod, path: countPath } = await sqlToRest({
          sql: 'SELECT COUNT(*) FROM releases'
        });

        const { data: countData } = await postgrestRequest({
          method: countMethod,
          path: countPath
        });

        const total = parseInt(countData[0].count);
        
        setReleases(records.map(record => ({
          ...record,
          artists: JSON.parse(record.artists),
          labels: JSON.parse(record.labels),
          styles: JSON.parse(record.styles)
        })));
        
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
        setError(null);
      } catch (err) {
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