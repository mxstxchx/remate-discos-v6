import { create } from 'zustand'

interface AuthActions {
 setModalOpen: (open: boolean) => void;
 setError: (error: string | null) => void;
 setAuthenticated: (isAuthenticated: boolean) => void;
}

interface AuthState {
  isAuthenticated: boolean;
  error: string | null;
  modalOpen: boolean;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  isAuthenticated: false,
  error: null,
  modalOpen: true, // Changed to show by default
 setModalOpen: (open: boolean) => set({ modalOpen: open }),
 setError: (error: string | null) => set({ error }),
 setAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated })
}))