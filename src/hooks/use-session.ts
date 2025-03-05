import { useEffect, useMemo } from 'react';
import { useStore } from '@/store';
import { useFilters } from './useFilters';
import { supabase } from '@/lib/supabase/client';
import type { Session, FilterState, SessionMetadata, isSessionMetadataObject } from '@/types/database';

export function useSession() {
  const session = useStore((state) => state.session);
  const setSession = useStore((state) => state.setSession);
  const filters = useFilters();

  // Get typed session metadata
  const sessionMetadata = useMemo(() => {
    if (session?.metadata && isSessionMetadataObject(session.metadata)) {
      return session.metadata as SessionMetadata;
    }
    return {} as SessionMetadata;
  }, [session?.metadata]);

  // Sync filters with session
  useEffect(() => {
    if (!session?.id) return;

    const saveFilters = async () => {
      const { error } = await supabase
        .from('sessions')
        .update({
          metadata: {
            // Use spread on sessionMetadata which is now properly typed
            ...sessionMetadata,
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
    if (!sessionMetadata.filters) return;

    const savedFilters = sessionMetadata.filters;
    
    filters.setArtists(savedFilters.artists);
    filters.setLabels(savedFilters.labels);
    filters.setStyles(savedFilters.styles);
    filters.setConditions(savedFilters.conditions);
    filters.setPriceRange(savedFilters.priceRange);
  }, [session?.id]);

  return { 
    session, 
    setSession,
    sessionMetadata, // Expose the properly typed metadata
    isAdmin: sessionMetadata.is_admin || false
  };
}