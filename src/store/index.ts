import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@/lib/supabase/types';
import type { Release } from './recordsSlice';
import type { CartItem } from '@/types/database';

interface AppState {
  session: Session | null;
  language: 'es' | 'en';
  viewPreference: 'grid' | 'list';
  releases: Release[];
  recordStatuses: Record<number, RecordStatus>;
  statusLastFetched: string | null;
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  scrollPosition: number;
  cartItems: CartItem[];
  cartLastValidated: string;
}

interface AppActions {
  setSession: (session: Session | null) => void;
  setLanguage: (language: 'es' | 'en') => void;
  updateRecordStatuses: (statuses: Record<number, RecordStatus>) => void;
  updateSingleStatus: (recordId: number, status: RecordStatus) => void;
  setViewPreference: (view: 'grid' | 'list') => void;
  setReleases: (releases: Release[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTotalPages: (total: number) => void;
  setCurrentPage: (page: number) => void;
  setScrollPosition: (position: number) => void;
  loadPersistedCart: (alias: string) => Promise<void>;
}

type Store = AppState & AppActions;

const initialState: AppState = {
  recordStatuses: {},
  statusLastFetched: null,
  session: null,
  language: 'es',
  viewPreference: 'grid',
  releases: [],
  loading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  scrollPosition: 0,
  cartItems: [],
  cartLastValidated: new Date().toISOString()
};

const store = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setSession: (session) => {
        set({ session });
        if (session?.user_alias) {
          get().loadPersistedCart(session.user_alias);
        }
      },

      updateRecordStatuses: (statuses) => set({
        recordStatuses: statuses,
        statusLastFetched: new Date().toISOString()
      }),

      updateSingleStatus: (recordId, status) => set(state => ({
        recordStatuses: {
          ...state.recordStatuses,
          [recordId]: status
        }
      })),
      
      setLanguage: (language) => set({ language }),
      setViewPreference: (view) => set({ viewPreference: view }),
      setReleases: (releases) => set({ releases }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTotalPages: (totalPages) => set({ totalPages }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setScrollPosition: (scrollPosition) => set({ scrollPosition }),
      
      loadPersistedCart: async (alias) => {
        const supabase = createClientComponentClient();
        const { data } = await supabase
          .from('cart_items')
          .select('*, releases(*)')
          .eq('user_alias', alias);
          
        set(state => ({
          cartItems: data || [],
          cartLastValidated: new Date().toISOString()
        }));
      }
    }),
    {
      name: 'remate-discos-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        viewPreference: state.viewPreference,
        session: state.session,
        cartItems: state.cartItems,
        cartLastValidated: state.cartLastValidated
      })
    }
  )
);

export const useStore = store;

// Export selector hooks to prevent unnecessary re-renders
export const useSession = () => useStore(state => state.session);
export const useRecordStatus = (recordId: number) =>
  useStore(state => state.recordStatuses[recordId]);
export const useStatusLastFetched = () =>
  useStore(state => state.statusLastFetched);
export const useCartItems = () => useStore(state => state.cartItems);
export const useCartValidation = () => useStore(state => state.cartLastValidated);