import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FilterState {
  artists: string[];
  labels: string[];
  styles: string[];
  conditions: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

interface FilterActions {
  setArtists: (artists: string[]) => void;
  setLabels: (labels: string[]) => void;
  setStyles: (styles: string[]) => void;
  setConditions: (conditions: string[]) => void;
  setPriceRange: (range: { min: number; max: number }) => void;
  clearFilter: (filterType: keyof FilterState) => void;
  clearAllFilters: () => void;
}

const initialState: FilterState = {
  artists: [],
  labels: [],
  styles: [],
  conditions: [],
  priceRange: {
    min: 3,
    max: 20
  }
};

export type FilterStore = FilterState & FilterActions;

export const useFilters = create<FilterStore>((set) => ({
  ...initialState,
  setArtists: (artists) => set({ artists }),
  setLabels: (labels) => set({ labels }),
  setStyles: (styles) => set({ styles }),
  setConditions: (conditions) => set({ conditions }),
  setPriceRange: (priceRange) => set({ priceRange }),
  clearFilter: (filterType) =>
    set((state) => ({
      ...state,
      [filterType]: Array.isArray(state[filterType]) ? [] : initialState[filterType]
    })),
  clearAllFilters: () => set(initialState)
}));