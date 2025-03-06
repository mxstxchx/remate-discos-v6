'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { AlertCircle } from 'lucide-react';

interface SessionData {
  id: string;
  user_alias: string;
  language: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  metadata: {
    is_admin: boolean;
    language: string;
  };
}

export function SessionsTable() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const currentSession = useStore(state => state.session);
  const { toast } = useToast();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sessions', {
        headers: {
          'X-User-Alias': currentSession?.user_alias || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load sessions'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSession?.user_alias) {
      fetchSessions();
      
      // Using singleton supabase client for real-time subscription
      const subscription = supabase
        .channel('admin-sessions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions'
          },
          () => {
            console.log('[ADMIN] Session change detected, refreshing...');
            fetchSessions();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [currentSession?.user_alias]);

  const handleTerminateSession = async (id: string) => {
    // Don't allow terminating the current session
    if (id === currentSession?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot terminate your current session'
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: {
          'X-User-Alias': currentSession?.user_alias || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to terminate session');
      }
      
      toast({
        title: 'Success',
        description: 'Session terminated successfully'
      });
      
      // Refresh the list
      fetchSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to terminate session'
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No active sessions</div>;
  }

  // Group sessions by user
  const userSessions: Record<string, SessionData[]> = {};
  
  sessions.forEach(session => {
    if (!userSessions[session.user_alias]) {
      userSessions[session.user_alias] = [];
    }
    userSessions[session.user_alias].push(session);
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">
          {sessions.length} active session{sessions.length !== 1 ? 's' : ''} across {Object.keys(userSessions).length} user{Object.keys(userSessions).length !== 1 ? 's' : ''}
        </h3>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">User</th>
            <th className="p-2 text-left">Created</th>
            <th className="p-2 text-left">Last activity</th>
            <th className="p-2 text-left">Expires</th>
            <th className="p-2 text-left">Admin</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(session => {
            const isCurrentSession = session.id === currentSession?.id;
            
            return (
              <tr
                key={session.id}
                className={`border-b border-border hover:bg-muted/50 ${isCurrentSession ? 'bg-primary/5' : ''}`}
              >
                <td className="p-2">
                  {session.user_alias}
                  {isCurrentSession && (
                    <Badge variant="secondary" className="ml-2">Current</Badge>
                  )}
                </td>
                <td className="p-2" title={format(new Date(session.created_at), 'PPpp')}>
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </td>
                <td className="p-2" title={format(new Date(session.last_seen_at), 'PPpp')}>
                  {formatDistanceToNow(new Date(session.last_seen_at), { addSuffix: true })}
                </td>
                <td className="p-2" title={format(new Date(session.expires_at), 'PPpp')}>
                  {formatDistanceToNow(new Date(session.expires_at), { addSuffix: true })}
                </td>
                <td className="p-2">
                  {session.metadata?.is_admin ? (
                    <Badge variant="default" className="bg-red-500 hover:bg-red-500">Admin</Badge>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </td>
                <td className="p-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCurrentSession}
                    onClick={() => handleTerminateSession(session.id)}
                    title={isCurrentSession ? "Can't terminate your current session" : "Terminate session"}
                  >
                    {isCurrentSession ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      "Terminate"
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}