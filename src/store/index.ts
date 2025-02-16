import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Session } from '@/lib/supabase/types'
import type { Release } from './recordsSlice'

interface AppState {
  session: Session | null
  language: 'es' | 'en'
  viewPreference: 'grid' | 'list'
  releases: Release[]
  loading: boolean
  error: string | null
  totalPages: number
  currentPage: number
}

interface AppActions {
  setSession: (session: Session | null) => void
  setLanguage: (language: 'es' | 'en') => void
  setViewPreference: (view: 'grid' | 'list') => void
  setReleases: (releases: Release[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setTotalPages: (total: number) => void
  setCurrentPage: (page: number) => void
}

export const useStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      session: null,
      language: 'es',
      viewPreference: 'grid',
      releases: [],
      loading: false,
      error: null,
      totalPages: 1,
      currentPage: 1,
      setSession: (session) => set({ session }),
      setLanguage: (language) => set({ language }),
      setViewPreference: (view) => set({ viewPreference: view }),
      setReleases: (releases) => set({ releases }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTotalPages: (totalPages) => set({ totalPages }),
      setCurrentPage: (currentPage) => set({ currentPage })
    }),
   {
     name: 'remate-discos-storage',
     storage: createJSONStorage(() => localStorage),
     partialize: (state) => ({
       language: state.language,
       viewPreference: state.viewPreference,
       session: state.session,
       isAuthenticated: state.session !== null
     })
   }
  )
)