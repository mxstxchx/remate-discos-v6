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
          console.log('[FILTER_COMBINATION] Starting fetchRecords with page:', page);
          let query = supabase
            .from('releases')
            .select('*', { count: 'exact' });

          const state = get();
          console.log('[FILTER_COMBINATION] Current filter state:', state);
          
          // Initialize empty arrays for each filter category
          const artistFilters = [];
          const labelFilters = [];
          const styleFilters = [];
          const conditionFilters = [];
          const priceFilters = [];

          // Build artist filters
          if (state.artists.length > 0) {
            console.log('[FILTER_COMBINATION] Adding artists:', state.artists);
            state.artists.forEach(artist => {
              artistFilters.push(`artists.cs.["${artist}"]`);
            });
          }

          // Build label filters
          if (state.labels.length > 0) {
            console.log('[FILTER_COMBINATION] Adding labels:', state.labels);
            state.labels.forEach(label => {
              const filterObj = JSON.stringify([{ name: label }]);
              labelFilters.push(`labels.cs.${filterObj}`);
            });
          }

          // Build styles filters
          if (state.styles.length > 0) {
            console.log('[FILTER_COMBINATION] Adding styles:', state.styles);
            state.styles.forEach(style => {
              styleFilters.push(`styles.cs.{${style}}`);
            });
          }

          // Build condition filters
          if (state.conditions.length > 0) {
            console.log('[FILTER_COMBINATION] Adding conditions:', state.conditions);
            conditionFilters.push(`condition.in.(${state.conditions.join(',')})`);
          }

          // Build price range filters
          if (state.priceRange.min > FILTER_DEFAULTS.priceRange.min) {
            priceFilters.push(`price.gte.${state.priceRange.min}`);
          }
          if (state.priceRange.max < FILTER_DEFAULTS.priceRange.max) {
            priceFilters.push(`price.lte.${state.priceRange.max}`);
          }

          // Apply styles filters (OR within category)
          if (styleFilters.length > 0) {
            console.log('[FILTER_COMBINATION] Applying styles filters:', styleFilters);
            query = query.or(styleFilters.join(','));
          }

          // Apply artist filters (OR within category)
          if (artistFilters.length > 0) {
            console.log('[FILTER_COMBINATION] Applying artist filters:', artistFilters);
            query = query.or(artistFilters.join(','));
          }

          // Apply label filters (OR within category)
          if (labelFilters.length > 0) {
            console.log('[FILTER_COMBINATION] Applying label filters:', labelFilters);
            query = query.or(labelFilters.join(','));
          }

          // Apply condition filters
          if (conditionFilters.length > 0) {
            console.log('[FILTER_COMBINATION] Applying condition filters:', conditionFilters);
            query = query.or(conditionFilters[0]);
          }

          // Apply price filters (AND between min and max)
          if (priceFilters.length > 0) {
            console.log('[FILTER_COMBINATION] Applying price filters:', priceFilters);
            priceFilters.forEach(filter => {
              query = query.or(filter);
            });
          }

          // Add ordering and pagination
          query = query
            .order('created_at', { ascending: false })
            .range(
              (page - 1) * FILTER_DEFAULTS.perPage,
              page * FILTER_DEFAULTS.perPage - 1
            );

          console.log('[FILTER_COMBINATION] Executing query...');
          const { data, error, count } = await query;

          if (error) {
            console.error('[FILTER_COMBINATION] Query error:', error);
            throw error;
          }

          console.log('[FILTER_COMBINATION] Query results:', {
            resultCount: data?.length,
            totalCount: count,
            firstResult: data?.[0]
          });

          return {
            data: data || [],
            count: count || 0
          };
        } catch (error) {
          console.error('[FILTER_COMBINATION] Error in fetchRecords:', error);
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