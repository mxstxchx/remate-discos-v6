'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useStore } from '@/store';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogEntry {
  id: string;
  release_id: number | null;
  user_alias: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
  releases?: {
    id: number;
    title: string;
  };
}

export function ActivityLog() {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const session = useStore(state => state.session);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/activities', {
        headers: {
          'X-User-Alias': session?.user_alias || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load activity log'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user_alias) {
      fetchActivities();
      
      // Set up real-time subscription
      const supabase = createClientComponentClient();
      const subscription = supabase
        .channel('admin-activity')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_logs'
          },
          () => {
            console.log('[ADMIN] New audit log detected, refreshing...');
            fetchActivities();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [session?.user_alias]);

  // Helper function to get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'MARK_SOLD':
        return 'bg-green-500/20 text-green-600 border-green-600/20';
      case 'EXPIRE_RESERVATION':
        return 'bg-amber-500/20 text-amber-600 border-amber-600/20';
      case 'TERMINATE_SESSION':
        return 'bg-red-500/20 text-red-600 border-red-600/20';
      case 'RESERVATION_EXPIRED':
        return 'bg-blue-500/20 text-blue-600 border-blue-600/20';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-600/20';
    }
  };

  // Helper function to format action for display
  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading activity log...</div>;
  }

  if (activities.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No activities recorded</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">Action</th>
            <th className="p-2 text-left">User</th>
            <th className="p-2 text-left">Record</th>
            <th className="p-2 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {activities.map(activity => (
            <tr key={activity.id} className="border-b border-border hover:bg-muted/50">
              <td className="p-2">
                <Badge
                  className={`font-normal ${getActionColor(activity.action)}`}
                >
                  {formatAction(activity.action)}
                </Badge>
              </td>
              <td className="p-2">{activity.user_alias}</td>
              <td className="p-2">
                {activity.releases ? (
                  <span className="font-medium">{activity.releases.title}</span>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </td>
              <td className="p-2">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}