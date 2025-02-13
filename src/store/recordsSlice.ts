import { StateCreator } from 'zustand';

export interface Release {
  id: number;
  title: string;
  artists: string[];
  labels: Array<{ name: string; catno: string }>;
  styles: string[];
  year: number;
  country: string | null;
  notes: string | null;
  condition: 'Mint' | 'Near Mint' | 'Very Good Plus' | 'Very Good';
  price: number;
  thumb: string;
  primary_image: string | null;
  secondary_image: string | null;
  tracklist: Array<{
    title: string;
    duration: string;
    position: string;
  }>;
}

export type ViewMode = 'grid' | 'list';

interface RecordsState {
  releases: Release[];
  viewMode: ViewMode;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  setReleases: (releases: Release[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
}

export const createRecordsSlice: StateCreator<RecordsState> = (set) => ({
  releases: [],
  viewMode: typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'grid',
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  
  setReleases: (releases) => set({ releases }),
  setViewMode: (viewMode) => set({ viewMode }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setTotalPages: (totalPages) => set({ totalPages })
});

export const ITEMS_PER_PAGE = 24; // Grid: 3x8 on desktop