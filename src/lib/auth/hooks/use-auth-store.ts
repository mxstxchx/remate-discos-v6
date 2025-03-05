import { create } from 'zustand'

interface AuthActions {
 setAuth: (authState: Partial<AuthState>) => void;
 reset: () => void;
 setModalOpen: (open: boolean) => void;
 setError: (error: string | null) => void;
 setAuthenticated: (isAuthenticated: boolean) => void;
}

interface AuthState {
 isAdmin: boolean;
 alias: string | null;
 session: any | null;

  isAuthenticated: boolean;
  error: string | null;
  modalOpen: boolean;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // Add all properties and their proper types
  setAuth: (authState: Partial<AuthState>) => set((state) => ({ ...state, ...authState })),
  reset: () => set({ isAuthenticated: false, isAdmin: false, alias: null, session: null, error: null }),
  isAuthenticated: false,
  isAdmin: false,
  alias: null,
  session: null,
  error: null,
  modalOpen: true, // Changed to show by default
 setModalOpen: (open: boolean) => set({ modalOpen: open }),
 setError: (error: string | null) => set({ error }),
 setAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated })
}))