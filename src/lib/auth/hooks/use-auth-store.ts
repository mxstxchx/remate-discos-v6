"use client"

import { create } from 'zustand'
import type { AuthState } from '../types'

interface AuthActions {
 setModalOpen: (open: boolean) => void;
}

interface AuthState {
 isAuthenticated: boolean;
 error: string | null;
 modalOpen: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isAdmin: false,
  alias: null,
  session: null,
  error: null
const useAuthStore = create<AuthState & AuthActions>((set) => ({
 isAuthenticated: false,
 error: null,
 modalOpen: false,
 setModalOpen: (open: boolean) => set({ modalOpen: open }),
  ...initialState,
  setAuth: (update) => set((state) => ({ ...state, ...update })),
  reset: () => set(initialState)
}))