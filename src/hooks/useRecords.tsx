import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store';
import { useFilters } from '@/hooks/useFilters';
import { ITEMS_PER_PAGE } from '@/store/recordsSlice';
import { sqlToRest, postgrestRequest } from '@/lib/api';
import { debounce } from 'lodash';

const APP_LOG = '[APP:records]';

// Cache structure for storing paginated results
const cache = new Map();

export function useRecords(page: number = 1) {
  console.log(`${APP_LOG} Initializing useRecords with page:`, page);
  
  const releases = useStore(state => state.releases);
  const setReleases = useStore(state => state.setReleases);
  const setLoading = useStore(state => state.setLoading);
  const setError = useStore(state => state.setError);
  const setTotalPages = useStore(state => state.setTotalPages);
  const loading = useStore(state => state.loading);
  const error = useStore(state => state.error);
  const totalPages = useStore(state => state.totalPages);
  
  // Get filter state
  const filters = {
    artists: useFilters(state => state.artists),
    labels: useFilters(state => state.labels),
    styles: useFilters(state => state.styles),
    conditions: useFilters(state => state.conditions),
    priceRange: useFilters(state => state.priceRange)
  };
  
  // Use ref to track mounted state
  const isMounted = useRef(true);
  
  // Create fetch function without debounce first
  const fetchRecords = async (pageNum: number, currentFilters: typeof filters) => {
    console.log(`${APP_LOG} Fetching records for page ${pageNum} with filters:`, currentFilters);
    
    if (!isMounted.current) {
      console.log(`${APP_LOG} Component unmounted, aborting fetch`);
      return;
    }
    
    const cacheKey = `page-${pageNum}`;
    console.log(`${APP_LOG} Cache key:`, cacheKey);
    
    // Check cache first
    if (cache.has(cacheKey)) {
      console.log(`${APP_LOG} Using cached data for page ${pageNum}`);
      setReleases(cache.get(cacheKey));
      setLoading(false);
      return;
    }
    
    try {
      console.log(`${APP_LOG} Building SQL query with filters`);
      // Fetch releases with pagination
      const { method, path } = await sqlToRest({
        sql: `
          SELECT
            id, title, artists, labels, styles, year,
            country, condition, price, thumb,
            primary_image, secondary_image
          FROM releases
          WHERE 1=1
            ${currentFilters.artists.length > 0
              ? `AND EXISTS (
                   SELECT 1 FROM jsonb_array_elements(artists) a
                   WHERE a->>'name' = ANY(${'{\'' + currentFilters.artists.join('\',\'') + '\'}'}::text[])
                 )`
              : ''}
            ${currentFilters.labels.length > 0
              ? `AND EXISTS (
                   SELECT 1 FROM jsonb_array_elements(labels) l
                   WHERE l->>'name' = ANY(${'{\'' + currentFilters.labels.join('\',\'') + '\'}'}::text[])
                 )`
              : ''}
            ${currentFilters.styles.length > 0
              ? `AND styles && ${'{\'' + currentFilters.styles.join('\',\'') + '\'}'}::text[]`
              : ''}
            ${currentFilters.conditions.length > 0
              ? `AND condition = ANY(${'{\'' + currentFilters.conditions.join('\',\'') + '\'}'}::text[])`
              : ''}
            AND price BETWEEN ${currentFilters.priceRange.min} AND ${currentFilters.priceRange.max}
          ORDER BY created_at DESC
          LIMIT ${ITEMS_PER_PAGE}
          OFFSET ${(pageNum - 1) * ITEMS_PER_PAGE}
        `
      });

      console.log(`${APP_LOG} Making API request with:`, { method, path });
      const records = await postgrestRequest({ method, path });
      console.log(`${APP_LOG} Received records:`, records?.length);

      if (records?.length && isMounted.current) {
        const parsedRecords = records.map(record => ({
          ...record,
          artists: typeof record.artists === 'string' ? JSON.parse(record.artists) : record.artists,
          labels: typeof record.labels === 'string' ? JSON.parse(record.labels) : record.labels,
          styles: typeof record.styles === 'string' ? JSON.parse(record.styles) : record.styles
        }));
        
        // Update cache
        cache.set(cacheKey, parsedRecords);
        
        // Update state
        setReleases(parsedRecords);
        
        // Prefetch next page
        if (pageNum < totalPages) {
          prefetchNextPage(pageNum + 1);
        }
      }

      if (!totalPages) {
        // Fetch total count only once
        const { method: countMethod, path: countPath } = await sqlToRest({
          sql: 'SELECT COUNT(*) FROM releases'
        });

        console.log(`${APP_LOG} Fetching total count with:`, { countMethod, countPath });
        const countResult = await postgrestRequest({
          method: countMethod,
          path: countPath
        });

        if (countResult?.[0]?.count && isMounted.current) {
          const total = Math.ceil(parseInt(countResult[0].count) / ITEMS_PER_PAGE);
          console.log(`${APP_LOG} Setting total pages:`, total);
          setTotalPages(total);
        }
      }

      setError(null);
    } catch (err) {
      console.error(`${APP_LOG} Error:`, err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch records');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };
  
  // Create debounced version
  const debouncedFetch = useCallback(
    debounce(fetchRecords, 300),
    [setReleases, setLoading, setError, setTotalPages, totalPages]
  );

  useEffect(() => {
    console.log(`${APP_LOG} useEffect triggered with page:`, page);
    setLoading(true);
    fetchRecords(page, filters);
    
    return () => {
      console.log(`${APP_LOG} Cleaning up useRecords`);
      isMounted.current = false;
      cache.clear();
    };
  }, [page, filters.artists, filters.labels, filters.styles, filters.conditions, filters.priceRange.min, filters.priceRange.max]);

  return { releases, loading, error, totalPages };
}