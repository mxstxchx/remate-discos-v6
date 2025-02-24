import type { Release, Session } from './database';

export interface AdminStats {
  activeReservations: number;
  queuedItems: number;
  activeSessions: number;
  totalRecords: number;
  soldRecords: number;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  release_id: number;
  user_alias: string;
  action: 'MARK_SOLD' | 'EXPIRE_RESERVATION' | 'TERMINATE_SESSION';
  details: Record<string, any>;
  created_at: string;
}

export interface AdminReservation {
  id: string;
  release: Release;
  user_alias: string;
  created_at: string;
  expires_at: string;
  queue_size: number;
}

export interface AdminSession {
  id: string;
  user_alias: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  is_admin: boolean;
}

export interface AdminState {
  stats: AdminStats;
  reservations: AdminReservation[];
  sessions: AdminSession[];
  activityLog: ActivityLogEntry[];
  isLoading: boolean;
  error: string | null;
}

export interface AdminActions {
  setStats: (stats: AdminStats) => void;
  setReservations: (reservations: AdminReservation[]) => void;
  setSessions: (sessions: AdminSession[]) => void;
  setActivityLog: (log: ActivityLogEntry[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}