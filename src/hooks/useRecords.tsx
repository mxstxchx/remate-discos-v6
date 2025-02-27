import { useEffect, useState, useMemo } from 'react';
import { useFilters } from './useFilters';
import type { Release } from '@/types/database';
import { FILTER_DEFAULTS } from '@/lib/constants';
import { useStore } from '@/store';

// Add module-level cache to persist data between page navigations
let recordsCache = {
  data: [] as Release[],
  filterHash: null as string | null,
  timestamp: null as number | null
};

export function useRecords(initialPage: number = 1) {
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [releases, setReleases] = useState<Release[]>([]);
  
  // Get scroll position from store
  const scrollPosition = useStore(state => state.scrollPosition);
  
  const {
    fetchRecords,
    isLoading,
    error
  } = useFilters();

  // Get current filter state to track changes
  const filters = useFilters();
  
  // Create a stable filter hash to detect changes
  const filterHash = useMemo(() => {
    return JSON.stringify({
      artists: filters.artists,
      labels: filters.labels,
      styles: filters.styles,
      conditions: filters.conditions,
      priceRange: filters.priceRange
    });
  }, [
    filters.artists,
    filters.labels,
    filters.styles,
    filters.conditions,
    filters.priceRange
  ]);
  
  // Check if this is a back navigation
  const isBackNavigation = scrollPosition > 0;
  
  useEffect(() => {
    console.log('[RECORDS_CACHE] Effect triggered with hash:', filterHash.slice(0, 20) + '...');
    console.log('[RECORDS_CACHE] Back navigation?', isBackNavigation);
    console.log('[RECORDS_CACHE] Cached filter hash?', recordsCache.filterHash?.slice(0, 20) + '...');
    
    // Skip fetch if navigating back with same filters
    if (isBackNavigation && recordsCache.data.length > 0 && recordsCache.filterHash === filterHash) {
      console.log('[RECORDS_CACHE] Using cached data from back navigation');
      setReleases(recordsCache.data);
      
      // Restore scroll position
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 0);
      
      return;
    }
    
    const loadRecords = async () => {
      try {
        console.log('[RECORDS] Fetching records...');
        const { data, count } = await fetchRecords(page);
        console.log('[RECORDS] Fetch complete:', {
          recordCount: data.length,
          totalCount: count
        });
        // Update both state and cache
        setReleases(data);
        recordsCache = {
          data,
          filterHash,
          timestamp: Date.now()
        };
        setTotalPages(Math.ceil(count / FILTER_DEFAULTS.perPage));
      } catch (error) {
        console.error('[RECORDS] Failed to load records:', error);
      }
    };

    loadRecords();
  }, [
    // Only depend on page and filterHash, not individual filter properties
    page,
    filterHash,
    fetchRecords,
    isBackNavigation,
    scrollPosition
  ]);

  return {
    releases,
    isLoading,
    error,
    page,
    totalPages,
    setPage
  };
}