import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';
import type { Session } from '@/lib/supabase/types';
import type { Release } from './recordsSlice';
import type { CartItem, RecordStatus } from '@/types/database';
import type { AdminState, AdminActions } from '@/types/admin';
import { createAdminSlice } from './adminSlice';

interface AdminState {
  stats: {
    activeReservations: number;
    queuedItems: number;
    activeSessions: number;
    totalRecords: number;
    soldRecords: number;
    updatedAt: string;
  };
  isLoading: boolean;
  error: string | null;
}

interface AppState {
  session: Session | null;
  language: 'es' | 'en';
  // Admin state
  admin: {
    stats: {
      activeReservations: number;
      queuedItems: number;
      activeSessions: number;
      totalRecords: number;
      soldRecords: number;
      updatedAt: string;
    };
    reservations: any[];
    sessions: any[];
    activityLog: any[];
    isLoading: boolean;
    error: string | null;
  };
  viewPreference: 'grid' | 'list';
  releases: Release[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  scrollPosition: number;
  cartItems: CartItem[];
  recordStatuses: Record<number, RecordStatus>;
  statusLastFetched: string | null;
}

interface AppActions {
  setSession: (session: Session | null) => void;
  setLanguage: (language: 'es' | 'en') => void;
  setViewPreference: (view: 'grid' | 'list') => void;
  setReleases: (releases: Release[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTotalPages: (total: number) => void;
  setCurrentPage: (page: number) => void;
  setScrollPosition: (position: number) => void;
  setCartItems: (items: CartItem[]) => void;
  updateRecordStatuses: (statuses: Record<number, RecordStatus>) => void;
  updateSingleStatus: (recordId: number, status: RecordStatus) => void;
  clearAllStatuses: () => void;
}

type Store = AppState & AppActions & AdminState & AdminActions;

const initialAdminState: AdminState = {
  stats: {
    activeReservations: 0,
    queuedItems: 0,
    activeSessions: 0,
    totalRecords: 0,
    soldRecords: 0,
    updatedAt: new Date().toISOString()
  },
  isLoading: false,
  error: null
};

const initialState: AppState = {
  session: null,
  language: 'es',
  admin: {
    stats: {
      activeReservations: 0,
      queuedItems: 0,
      activeSessions: 0,
      totalRecords: 0,
      soldRecords: 0,
      updatedAt: new Date().toISOString()
    },
    reservations: [],
    sessions: [],
    activityLog: [],
    isLoading: false,
    error: null
  },
  viewPreference: 'grid',
  releases: [],
  loading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  scrollPosition: 0,
  cartItems: [],
  recordStatuses: {},
  statusLastFetched: null
};

const store = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,
      admin: initialAdminState,
      ...initialState,
      ...createAdminSlice(set, get),
      
      setSession: (session) => set({ session }),
      setLanguage: (language) => set({ language }),
      setViewPreference: (view) => set({ viewPreference: view }),
      setReleases: (releases) => set({ releases }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTotalPages: (totalPages) => set({ totalPages }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setScrollPosition: (scrollPosition) => set({ scrollPosition }),
      
      setCartItems: (cartItems: CartItem[]) => {
        console.log('[Cart_Items] Updating store cart items:',
          cartItems.map(item => ({
            id: item.release_id,
            status: item.status,
            queuePosition: item.queue_position
          }))
        );
        set({ cartItems });
      },
      
      // Updated to handle both complete replacement and partial updates
      updateRecordStatuses: (statuses) => {
        const currentStatuses = get().recordStatuses;
        
        // Check if it's a complete replacement or partial update
        if (Object.keys(statuses).length > 10) {
          // For large updates, replace the entire state
          console.log(`[STORE] Complete status replacement with ${Object.keys(statuses).length} items`);
          set({
            recordStatuses: statuses,
            statusLastFetched: new Date().toISOString()
          });
        } else {
          // For small updates, merge with existing state
          console.log(`[STORE] Partial status update for ${Object.keys(statuses).length} items`);
          set({
            recordStatuses: { ...currentStatuses, ...statuses },
            statusLastFetched: new Date().toISOString()
          });
        }
      },
      
      updateSingleStatus: (recordId, status) => {
        console.log(`[STORE] Updating single status for record ${recordId}:`, status);
        set(state => ({
          recordStatuses: {
            ...state.recordStatuses,
            [recordId]: status
          },
          statusLastFetched: new Date().toISOString()
        }));
      },
      
      clearAllStatuses: () => {
        console.log('[STORE] Clearing all record statuses');
        set({
          recordStatuses: {},
          statusLastFetched: new Date().toISOString()
        });
      }
    }),
    {
      name: 'remate-discos-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        viewPreference: state.viewPreference,
        session: state.session,
        cartItems: state.cartItems
      })
    }
  )
);

export const useStore = store;

// Export selector hooks to prevent unnecessary re-renders
export const useSession = () => useStore(state => state.session);
export const useCartItems = () => useStore(state => state.cartItems);
export const useRecordStatus = (recordId: number) =>
  useStore(state => state.recordStatuses[recordId]);
export const useStatusLastFetched = () =>
  useStore(state => state.statusLastFetched);