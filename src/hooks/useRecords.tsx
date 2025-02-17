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

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const { data, count } = await fetchRecords(page);
        setReleases(data);
        setTotalPages(Math.ceil(count / FILTER_DEFAULTS.perPage));
      } catch (error) {
        console.error('Failed to load records:', error);
      }
    };

    loadRecords();
  }, [page, fetchRecords]);

  return {
    releases,
    isLoading,
    error,
    page,
    totalPages,
    setPage
  };
}