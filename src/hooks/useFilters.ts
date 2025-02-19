import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';
import { FILTER_DEFAULTS } from '@/lib/constants';
import type { FilterState, Release } from '@/types/database';

interface FilterStore extends FilterState {
  // Filter state setters
  setArtists: (artists: string[]) => void;
  setLabels: (labels: string[]) => void;
  setStyles: (styles: string[]) => void;
  setConditions: (conditions: string[]) => void;
  setPriceRange: (range: { min: number; max: number }) => void;
  clearFilter: (filterType: keyof FilterState) => void;
  clearAllFilters: () => void;
  
  // Data fetching
  fetchRecords: (page: number) => Promise<{ data: Release[]; count: number }>;
  isLoading: boolean;
  error: string | null;
}

export const useFilters = create<FilterStore>()(
  persist(
    (set, get) => ({
      // Initial state
      artists: [],
      labels: [],
      styles: [],
      conditions: [],
      priceRange: FILTER_DEFAULTS.priceRange,
      isLoading: false,
      error: null,

      // Setters
      setArtists: (artists) => set({ artists }),
      setLabels: (labels) => set({ labels }),
      setStyles: (styles) => set({ styles }),
      setConditions: (conditions) => set({ conditions }),
      setPriceRange: (priceRange) => set({ priceRange }),
      
      clearFilter: (filterType) =>
        set((state) => ({
          ...state,
          [filterType]: Array.isArray(state[filterType])
            ? []
            : FILTER_DEFAULTS[filterType]
        })),
      
      clearAllFilters: () => set({ ...FILTER_DEFAULTS }),

      // Data fetching
      fetchRecords: async (page) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('[FILTERS] Starting fetchRecords with page:', page);
          let query = supabase
            .from('releases')
            .select('*', { count: 'exact' });

          const state = get();
          console.log('[FILTERS] Current filter state:', state);
          
          let filters = [];

          // Build artist filters
          if (state.artists.length > 0) {
            console.log('[FILTERS] Adding artists filter:', state.artists);
            state.artists.forEach(artist => {
              filters.push(`artists.cs.["${artist}"]`);
            });
          }

          // Build label filters
          if (state.labels.length > 0) {
            console.log('[FILTERS] Adding labels filter:', state.labels);
            state.labels.forEach(label => {
              // Format for PostgREST JSON containment using cs operator
              const filterObj = JSON.stringify([{ name: label }]);
              filters.push(`labels.cs.${filterObj}`);
            });
          }

          // Build styles filters
          if (state.styles.length > 0) {
            console.log('[FILTERS] Adding styles filter:', state.styles);
            state.styles.forEach(style => {
              filters.push(`styles.cs.{${style}}`);
            });
          }

          // Build condition filters
          if (state.conditions.length > 0) {
            console.log('[FILTERS] Adding conditions filter:', state.conditions);
            filters.push(`condition.in.(${state.conditions.join(',')})`);
          }

          // Add price range filters
          if (state.priceRange.min > FILTER_DEFAULTS.priceRange.min) {
            filters.push(`price.gte.${state.priceRange.min}`);
          }
          if (state.priceRange.max < FILTER_DEFAULTS.priceRange.max) {
            filters.push(`price.lte.${state.priceRange.max}`);
          }

          console.log('[FILTERS] All filters:', filters);

          // Apply all filters
          if (filters.length > 0) {
            query = query.or(filters.join(','));
          }

          // Add ordering and pagination
          query = query
            .order('created_at', { ascending: false })
            .range(
              (page - 1) * FILTER_DEFAULTS.perPage,
              page * FILTER_DEFAULTS.perPage - 1
            );

          console.log('[FILTERS] Executing query...');
          const { data, error, count } = await query;

          if (error) {
            console.error('[FILTERS] Query error:', error);
            throw error;
          }

          console.log('[FILTERS] Query results:', {
            resultCount: data?.length,
            totalCount: count,
            firstResult: data?.[0]
          });

          return {
            data: data || [],
            count: count || 0
          };
        } catch (error) {
          console.error('[FILTERS] Error in fetchRecords:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'record-filters',
      partialize: (state) => ({
        artists: state.artists,
        labels: state.labels,
        styles: state.styles,
        conditions: state.conditions,
        priceRange: state.priceRange
      })
    }
  )
);