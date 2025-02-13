"use client"

import { create } from 'zustand'
import type { AuthState } from '../types'

type AuthStore = AuthState & {
  setAuth: (update: Partial<AuthState>) => void
  reset: () => void
}

const initialState: AuthState = {
  isAuthenticated: false,
  isAdmin: false,
  alias: null,
  session: null,
  error: null
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setAuth: (update) => set((state) => ({ ...state, ...update })),
  reset: () => set(initialState)
}))