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
  
  // Create debounced fetch function
  const debouncedFetch = useCallback(
    debounce(async (pageNum: number, filters: FilterState) => {
      if (!isMounted.current) return;
      
      const cacheKey = `page-${pageNum}-${JSON.stringify(filters)}`;
      
      // Check cache first
      if (cache.has(cacheKey)) {
        console.log(`${APP_LOG} Using cached data for page ${pageNum}`);
        setReleases(cache.get(cacheKey));
        setLoading(false);
        return;
      }
      
      try {
        // Fetch releases with pagination
        const { method, path } = await sqlToRest({
          sql: `
            SELECT
              id, title, artists, labels, styles, year,
              country, condition, price, thumb,
              primary_image, secondary_image
            FROM releases
            WHERE
              (${filters.artists.length === 0} OR
               artists->>'name' = ANY('{${filters.artists.join(',')}}'::text[]))
              AND
              (${filters.labels.length === 0} OR
               labels->>'name' = ANY('{${filters.labels.join(',')}}'::text[]))
              AND
              (${filters.styles.length === 0} OR
               styles && '{${filters.styles.join(',')}}'::text[])
              AND
              (${filters.conditions.length === 0} OR
               condition = ANY('{${filters.conditions.join(',')}}'::text[]))
              AND
              price BETWEEN ${filters.priceRange.min} AND ${filters.priceRange.max}
            ORDER BY created_at DESC
            LIMIT ${ITEMS_PER_PAGE}
            OFFSET ${(pageNum - 1) * ITEMS_PER_PAGE}
          `
        });

        const records = await postgrestRequest({ method, path });
        console.log(`${APP_LOG} Fetched records for page ${pageNum}:`, records?.length);

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

          const countResult = await postgrestRequest({
            method: countMethod,
            path: countPath
          });

          if (countResult?.[0]?.count && isMounted.current) {
            setTotalPages(Math.ceil(parseInt(countResult[0].count) / ITEMS_PER_PAGE));
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
    }, 300),
    [setReleases, setLoading, setError, setTotalPages, totalPages]
  );

  // Prefetch next page
  const prefetchNextPage = useCallback(async (nextPage: number) => {
    const cacheKey = `page-${nextPage}`;
    if (cache.has(cacheKey)) return;

    try {
      const { method, path } = await sqlToRest({
        sql: `
          SELECT
            id, title, artists, labels, styles, year,
            country, condition, price, thumb,
            primary_image, secondary_image
          FROM releases
          ORDER BY created_at DESC
          LIMIT ${ITEMS_PER_PAGE}
          OFFSET ${(nextPage - 1) * ITEMS_PER_PAGE}
        `
      });

      const records = await postgrestRequest({ method, path });
      
      if (records?.length) {
        const parsedRecords = records.map(record => ({
          ...record,
          artists: typeof record.artists === 'string' ? JSON.parse(record.artists) : record.artists,
          labels: typeof record.labels === 'string' ? JSON.parse(record.labels) : record.labels,
          styles: typeof record.styles === 'string' ? JSON.parse(record.styles) : record.styles
        }));
        
        cache.set(cacheKey, parsedRecords);
      }
    } catch (error) {
      console.error(`${APP_LOG} Prefetch error:`, error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    debouncedFetch(page, filters);
    
    return () => {
      isMounted.current = false;
    };
  }, [page, debouncedFetch, filters.artists, filters.labels, filters.styles, filters.conditions, filters.priceRange]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      cache.clear();
    };
  }, []);

  return { releases, loading, error, totalPages };
}