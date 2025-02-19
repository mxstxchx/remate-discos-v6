import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';
import { FILTER_DEFAULTS } from '@/lib/constants';
import type { FilterState, Release } from '@/types/database';

interface FilterOptions {
  artists: string[];
  labels: string[];
  styles: string[];
  conditions: string[];
}

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
  getFilteredOptions: (category: keyof FilterOptions) => Promise<string[]>;
  isLoading: boolean;
  isLoadingOptions: boolean;
  error: string | null;
  optionsError: string | null;
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
      isLoadingOptions: false,
      error: null,
      optionsError: null,

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
      
      clearAllFilters: () => {
        console.log('[FILTER_DYNAMIC_OPTIONS] Executing clearAllFilters');
        console.log('[FILTER_DYNAMIC_OPTIONS] Current state:', get());
        console.log('[FILTER_DYNAMIC_OPTIONS] Setting to defaults:', FILTER_DEFAULTS);
        set({
          artists: [],
          labels: [],
          styles: [],
          conditions: [],
          priceRange: FILTER_DEFAULTS.priceRange,
          isLoading: false,
          isLoadingOptions: false,
          error: null,
          optionsError: null
        });
        console.log('[FILTER_DYNAMIC_OPTIONS] New state after clear:', get());
      },

      getFilteredOptions: async (category) => {
        set({ isLoadingOptions: true, optionsError: null });
        
        try {
          console.log('[FILTER_OPTIONS] Fetching options for category:', category);
          const state = get();
          console.log('[FILTER_OPTIONS] Current filter state:', state);

          let query = supabase.from('releases').select('*');
          
          // Build filters excluding the requested category
          const artistFilters = category !== 'artists' && state.artists.length > 0
            ? state.artists.map(artist => `artists.cs.["${artist}"]`)
            : [];

          const labelFilters = category !== 'labels' && state.labels.length > 0
            ? state.labels.map(label => {
                const filterObj = JSON.stringify([{ name: label }]);
                return `labels.cs.${filterObj}`;
              })
            : [];

          const styleFilters = category !== 'styles' && state.styles.length > 0
            ? state.styles.map(style => `styles.cs.{${style}}`)
            : [];

          const conditionFilters = category !== 'conditions' && state.conditions.length > 0
            ? [`condition.in.(${state.conditions.join(',')})`]
            : [];

          console.log('[FILTER_OPTIONS] Built filters:', {
            artistFilters,
            labelFilters,
            styleFilters,
            conditionFilters
          });

          // Apply filters
          if (artistFilters.length > 0) {
            query = query.or(artistFilters.join(','));
          }
          if (labelFilters.length > 0) {
            query = query.or(labelFilters.join(','));
          }
          if (styleFilters.length > 0) {
            query = query.or(styleFilters.join(','));
          }
          if (conditionFilters.length > 0) {
            query = query.or(conditionFilters[0]);
          }

          console.log('[FILTER_OPTIONS] Executing query...');
          const { data, error } = await query;

          if (error) {
            console.error('[FILTER_OPTIONS] Query error:', error);
            throw error;
          }

          // Extract unique values for the requested category
          const uniqueValues = new Set<string>();
          
          data?.forEach(record => {
            switch (category) {
              case 'artists':
                record.artists?.forEach((artist: any) => {
                  if (typeof artist === 'string') {
                    uniqueValues.add(artist);
                  } else if (artist?.name) {
                    uniqueValues.add(artist.name);
                  }
                });
                break;
              case 'labels':
                record.labels?.forEach((label: any) => {
                  if (label?.name) {
                    uniqueValues.add(label.name);
                  }
                });
                break;
              case 'styles':
                record.styles?.forEach((style: string) => {
                  uniqueValues.add(style);
                });
                break;
              case 'conditions':
                if (record.condition) {
                  uniqueValues.add(record.condition);
                }
                break;
            }
          });

          const options = Array.from(uniqueValues).sort();
          console.log(`[FILTER_OPTIONS] Found ${options.length} options for ${category}`);
          
          return options;
        } catch (error) {
          console.error('[FILTER_OPTIONS] Error fetching options:', error);
          set({ optionsError: error.message });
          throw error;
        } finally {
          set({ isLoadingOptions: false });
        }
      },

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
            .order('created_at', { ascending: false });

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