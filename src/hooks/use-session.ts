import { useEffect } from 'react';
import { useStore } from '@/store';
import { useFilters } from './useFilters';
import { supabase } from '@/lib/supabase/client';
import type { Session, FilterState } from '@/types/database';

export function useSession() {
  const session = useStore((state) => state.session);
  const setSession = useStore((state) => state.setSession);
  const filters = useFilters();

  // Sync filters with session
  useEffect(() => {
    if (!session?.id) return;

    const saveFilters = async () => {
      const { error } = await supabase
        .from('sessions')
        .update({
          metadata: {
            ...session.metadata,
            filters: {
              artists: filters.artists,
              labels: filters.labels,
              styles: filters.styles,
              conditions: filters.conditions,
              priceRange: filters.priceRange
            }
          }
        })
        .eq('id', session.id);

      if (error) {
        console.error('Failed to save filters:', error);
      }
    };

    saveFilters();
  }, [
    session?.id,
    filters.artists,
    filters.labels,
    filters.styles,
    filters.conditions,
    filters.priceRange
  ]);

  // Restore filters from session
  useEffect(() => {
    if (!session?.metadata?.filters) return;

    const savedFilters = session.metadata.filters as FilterState;
    
    filters.setArtists(savedFilters.artists);
    filters.setLabels(savedFilters.labels);
    filters.setStyles(savedFilters.styles);
    filters.setConditions(savedFilters.conditions);
    filters.setPriceRange(savedFilters.priceRange);
  }, [session?.id]);

  return { session, setSession };
}