import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Session } from '@/lib/supabase/types'

interface AppState {
  session: Session | null
  language: 'es' | 'en'
  viewPreference: 'grid' | 'list'
}

interface AppActions {
  setSession: (session: Session | null) => void
  setLanguage: (language: 'es' | 'en') => void
  setViewPreference: (view: 'grid' | 'list') => void
}

export const useStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      session: null,
      language: 'es',
      viewPreference: 'grid',
      setSession: (session) => set({ session }),
      setLanguage: (language) => set({ language }),
      setViewPreference: (view) => set({ viewPreference: view })
    }),
    {
      name: 'remate-discos-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        viewPreference: state.viewPreference
      })
    }
  )
)