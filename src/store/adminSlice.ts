import { StateCreator } from 'zustand';
import type {
  AdminState,
  AdminActions,
  AdminStats,
  AdminReservation,
  AdminSession,
  ActivityLogEntry
} from '@/types/admin';

const initialStats: AdminStats = {
  activeReservations: 0,
  queuedItems: 0,
  activeSessions: 0,
  totalRecords: 0,
  soldRecords: 0,
  updatedAt: new Date().toISOString()
};

export const createAdminSlice: StateCreator<
  any, // Use any type to avoid circular dependency with Store
  [],
  [],
  AdminState & AdminActions
> = (set: any, get, _store: any) => ({
  // State
  stats: initialStats,
  reservations: [],
  sessions: [],
  activityLog: [],
  isLoading: false,
  error: null,

  // Actions
  setStats: (stats) =>
    set((state) => ({
      stats: {
        ...state.stats,
        ...stats,
        updatedAt: new Date().toISOString()
      }
    })),

  setReservations: (reservations) =>
    set({ reservations }),

  setSessions: (sessions) =>
    set({ sessions }),

  setActivityLog: (activityLog) =>
    set({ activityLog }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error }),

  clearError: () =>
    set({ error: null })
});