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
  
  const fetchRecords = async (pageNum: number, currentFilters: typeof filters) => {
    console.log(`${APP_LOG} Fetching records for page ${pageNum} with filters:`, currentFilters);
    
    if (!isMounted.current) {
      console.log(`${APP_LOG} Component unmounted, aborting fetch`);
      return;
    }
    
    const cacheKey = `page-${pageNum}-${JSON.stringify(currentFilters)}`;
    console.log(`${APP_LOG} Cache key:`, cacheKey);
    
    // Check cache first
    if (cache.has(cacheKey)) {
      console.log(`${APP_LOG} Using cached data for page ${pageNum}`);
      setReleases(cache.get(cacheKey));
      setLoading(false);
      return;
    }
    
    try {
      // Generate a filter string for the query
      const conditions = [];
      
      if (currentFilters.artists.length > 0) {
        // Use array contains for artists
        conditions.push(`artists && ARRAY[${currentFilters.artists.map(artist =>
          `'${artist}'`
        )}]::text[]`);
      }
      
      if (currentFilters.labels.length > 0) {
        // Use JSONB contains operator with OR logic
        const labelConditions = currentFilters.labels.map(label =>
          `labels @> '[{"name": "${label}"}]'`
        );
        conditions.push(`(${labelConditions.join(' OR ')})`);
      }
      
      if (currentFilters.styles.length > 0) {
        // Use ANY operator for OR logic with arrays
        conditions.push(`styles && ARRAY[${currentFilters.styles.map(s =>
          `'${s}'`
        )}]::text[]`);
      }

      if (currentFilters.conditions.length > 0) {
        // Single IN clause for conditions
        conditions.push(`condition IN ('${currentFilters.conditions.join("', '")}')`);
      }
      
      if (currentFilters.conditions.length > 0) {
        conditions.push(`condition IN ('${currentFilters.conditions.join("','")}')`)
      }
      
      conditions.push(`price >= ${currentFilters.priceRange.min}`);
      conditions.push(`price <= ${currentFilters.priceRange.max}`);

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      console.log(`${APP_LOG} Constructed WHERE clause:`, whereClause);
      
      const sqlQuery = `
        SELECT
          id, title, artists, labels, styles, year,
          country, condition, price, thumb,
          primary_image, secondary_image
        FROM releases
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${ITEMS_PER_PAGE}
        OFFSET ${(pageNum - 1) * ITEMS_PER_PAGE}
      `;
      
      console.log(`${APP_LOG} Executing SQL query:`, sqlQuery);
      
      const { method, path } = await sqlToRest({ sql: sqlQuery });

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
      }

      if (!totalPages) {
        // Fetch total count only once
        const countQuery = `SELECT COUNT(*) FROM releases ${whereClause}`;
        console.log(`${APP_LOG} Executing count query:`, countQuery);
        
        const { method: countMethod, path: countPath } = await sqlToRest({
          sql: countQuery
        });

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

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useCallback(() => ({
    artists: filters.artists,
    labels: filters.labels,
    styles: filters.styles,
    conditions: filters.conditions,
    priceRange: filters.priceRange
  }), [
    filters.artists,
    filters.labels,
    filters.styles,
    filters.conditions,
    filters.priceRange.min,
    filters.priceRange.max
  ]);

  useEffect(() => {
    console.log(`${APP_LOG} useEffect triggered with page:`, page);
    setLoading(true);
    
    const currentFilters = memoizedFilters();
    console.log(`${APP_LOG} Current filters:`, currentFilters);
    
    // Don't clear cache on unmount, persist it
    isMounted.current = true;
    fetchRecords(page, currentFilters);
    
    return () => {
      console.log(`${APP_LOG} Cleaning up useRecords`);
      isMounted.current = false;
    };
  }, [page, memoizedFilters]);

  return { releases, loading, error, totalPages };
}