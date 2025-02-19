import { useEffect, useState } from 'react';
import { useFilters } from './useFilters';
import type { Release } from '@/types/database';
import { FILTER_DEFAULTS } from '@/lib/constants';

export function useRecords(initialPage: number = 1) {
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [releases, setReleases] = useState<Release[]>([]);
  
  const {
    fetchRecords,
    isLoading,
    error
  } = useFilters();

  // Get current filter state to track changes
  const filters = useFilters();
  
  useEffect(() => {
    console.log('[RECORDS] Effect triggered with:', {
      page,
      artistsCount: filters.artists.length,
      labelsCount: filters.labels.length,
      stylesCount: filters.styles.length,
      conditionsCount: filters.conditions.length,
      priceRange: filters.priceRange
    });
    
    const loadRecords = async () => {
      try {
        console.log('[RECORDS] Fetching records...');
        const { data, count } = await fetchRecords(page);
        console.log('[RECORDS] Fetch complete:', {
          recordCount: data.length,
          totalCount: count
        });
        setReleases(data);
        setTotalPages(Math.ceil(count / FILTER_DEFAULTS.perPage));
      } catch (error) {
        console.error('[RECORDS] Failed to load records:', error);
      }
    };

    loadRecords();
  }, [
    page,
    fetchRecords,
    filters.artists,
    filters.labels,
    filters.styles,
    filters.conditions,
    filters.priceRange
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