import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';

export function useAdmin() {
  // Using the singleton supabase client from client.ts
  const admin = useStore(state => state.admin);
  const setAdmin = useStore(state => (set: any) => ({
    admin: { ...state.admin, ...set }
  }));

  const fetchStats = useCallback(async () => {
    try {
      setAdmin({ isLoading: true, error: null });

      const [
        { count: activeReservations },
        { count: queuedItems },
        { count: activeSessions },
        { count: totalRecords },
        { count: soldRecords }
      ] = await Promise.all([
        supabase
          .from('reservations')
          .select('*', { count: 'exact' })
          .eq('status', 'RESERVED'),
        supabase
          .from('reservation_queue')
          .select('*', { count: 'exact' }),
        supabase
          .from('sessions')
          .select('*', { count: 'exact' })
          .gt('expires_at', new Date().toISOString()),
        supabase
          .from('releases')
          .select('*', { count: 'exact' }),
        supabase
          .from('releases')
          .select('*', { count: 'exact' })
          .not('sold_at', 'is', null)
      ]);

      setAdmin({
        stats: {
          activeReservations: activeReservations || 0,
          queuedItems: queuedItems || 0,
          activeSessions: activeSessions || 0,
          totalRecords: totalRecords || 0,
          soldRecords: soldRecords || 0,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setAdmin({ error: 'Failed to fetch stats' });
    } finally {
      setAdmin({ isLoading: false });
    }
  }, [setAdmin, supabase]);

  const markAsSold = useCallback(async (
    releaseId: number,
    notes?: string
  ) => {
    try {
      setAdmin({ isLoading: true, error: null });

      // Get the current session's user alias
      const session = useStore.getState().session;
      if (!session?.user_alias) {
        throw new Error('No active session');
      }

      const { error: fnError } = await supabase
        .rpc('mark_record_as_sold', {
          p_release_id: releaseId,
          p_admin_alias: session.user_alias,
          p_notes: notes
        });

      if (fnError) throw fnError;

      await fetchStats();
    } catch (error) {
      console.error('Error marking record as sold:', error);
      setAdmin({ error: 'Failed to mark record as sold' });
    } finally {
      setAdmin({ isLoading: false });
    }
  }, [setAdmin, fetchStats, supabase]);

  const fetchReservations = useCallback(async () => {
    try {
      setAdmin({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          release:releases (
            id,
            title,
            artists,
            price,
            condition
          )
        `)
        .eq('status', 'RESERVED')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get queue sizes for each reservation
      const reservationsWithQueue = await Promise.all(
        (data || []).map(async (reservation) => {
          const { count } = await supabase
            .from('reservation_queue')
            .select('*', { count: 'exact' })
            .eq('release_id', reservation.release_id);

          return {
            ...reservation,
            queue_size: count || 0
          };
        })
      );

      setAdmin({ reservations: reservationsWithQueue });
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setAdmin({ error: 'Failed to fetch reservations' });
    } finally {
      setAdmin({ isLoading: false });
    }
  }, [setAdmin, supabase]);

  const expireReservation = useCallback(async (
    reservationId: string
  ) => {
    try {
      setAdmin({ isLoading: true, error: null });

      // Get the current session's user alias
      const session = useStore.getState().session;
      if (!session?.user_alias) {
        throw new Error('No active session');
      }

      // Use the dedicated admin_expire_reservation function
      const { error: fnError } = await supabase
        .rpc('admin_expire_reservation', {
          p_reservation_id: reservationId,
          p_admin_alias: session.user_alias
        });

      if (fnError) throw fnError;

      await fetchReservations();
      await fetchStats();
    } catch (error) {
      console.error('Error expiring reservation:', error);
      setAdmin({ error: 'Failed to expire reservation' });
    } finally {
      setAdmin({ isLoading: false });
    }
  }, [setAdmin, fetchReservations, fetchStats, supabase]);

  const fetchActivityLog = useCallback(async () => {
    try {
      setAdmin({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAdmin({ activityLog: data });
    } catch (error) {
      console.error('Error fetching activity log:', error);
      setAdmin({ error: 'Failed to fetch activity log' });
    } finally {
      setAdmin({ isLoading: false });
    }
  }, [setAdmin, supabase]);

  const fetchSessions = useCallback(async () => {
    try {
      setAdmin({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAdmin({ sessions: data });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setAdmin({ error: 'Failed to fetch sessions' });
    } finally {
      setAdmin({ isLoading: false });
    }
  }, [setAdmin, supabase]);

  const terminateSession = useCallback(async (
    sessionId: string
  ) => {
    try {
      setAdmin({ isLoading: true, error: null });

      const { error } = await supabase
        .from('sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchSessions();
      await fetchStats();
    } catch (error) {
      console.error('Error terminating session:', error);
      setAdmin({ error: 'Failed to terminate session' });
    } finally {
      setAdmin({ isLoading: false });
    }
  }, [setAdmin, fetchSessions, fetchStats, supabase]);

  // Set up real-time subscriptions
  useEffect(() => {
    const subscription = supabase
      .channel('admin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        () => {
          fetchStats();
          fetchReservations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_queue'
        },
        () => {
          fetchStats();
          fetchReservations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        () => {
          fetchActivityLog();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        () => {
          fetchSessions();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStats, fetchReservations, fetchActivityLog, fetchSessions]);

  return {
    ...admin,
    fetchStats,
    markAsSold,
    fetchReservations,
    expireReservation,
    fetchActivityLog,
    fetchSessions,
    terminateSession
  };
}