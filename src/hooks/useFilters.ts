import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';
import { useSession } from './use-session';
import { type FilterState, type Release } from '@/types/database';
import { FILTER_DEFAULTS } from '@/lib/constants';

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
          let query = supabase
            .from('releases')
            .select('*', { count: 'exact' });

          const state = get();
          
          // Apply filters
          if (state.artists.length > 0) {
            query = query.contains('artists', state.artists.map(artist => ({ name: artist })));
          }
          
          if (state.labels.length > 0) {
            const labelQueries = state.labels.map(label =>
              `labels::jsonb @> '[{"name":"${label}"}]'`
            );
            query = query.or(labelQueries.join(','));
          }
          
          if (state.styles.length > 0) {
            query = query.contains('styles', state.styles);
          }
          
          if (state.conditions.length > 0) {
            query = query.in('condition', state.conditions);
          }
          
          query = query
            .gte('price', state.priceRange.min)
            .lte('price', state.priceRange.max)
            .order('created_at', { ascending: false })
            .range(
              (page - 1) * FILTER_DEFAULTS.perPage,
              page * FILTER_DEFAULTS.perPage - 1
            );

          const { data, error, count } = await query;
          
          if (error) throw error;
          
          return {
            data: data || [],
            count: count || 0
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch records';
          set({ error: message });
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