'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface QueueItem {
  id: string;
  release_id: number;
  user_alias: string;
  queue_position: number;
  joined_at: string;
  release: {
    id: number;
    title: string;
    artists: Array<{ name: string }>;
    price: number;
    condition: string;
  };
}

export function QueueTable() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupByRecord, setGroupByRecord] = useState(true);
  const session = useStore(state => state.session);
  const { toast } = useToast();

  const fetchQueueItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/queue', {
        headers: {
          'X-User-Alias': session?.user_alias || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue items');
      }
      
      const data = await response.json();
      setQueueItems(data);
    } catch (error) {
      console.error('Error fetching queue items:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load queue items'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user_alias) {
      fetchQueueItems();
      
      // Using singleton supabase client for real-time subscription
      const subscription = supabase
        .channel('admin-queue')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservation_queue'
          },
          () => {
            console.log('[ADMIN] Queue change detected, refreshing...');
            fetchQueueItems();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations'
          },
          () => {
            console.log('[ADMIN] Reservation change detected, refreshing queue...');
            fetchQueueItems();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [session?.user_alias]);

  if (loading) {
    return <div className="flex justify-center p-4">Loading queue data...</div>;
  }

  if (queueItems.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No items in queue</div>;
  }

  // Group queue items by record
  const groupedItems: Record<number, QueueItem[]> = {};
  
  queueItems.forEach(item => {
    if (!groupedItems[item.release_id]) {
      groupedItems[item.release_id] = [];
    }
    groupedItems[item.release_id].push(item);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">
          {queueItems.length} queued position{queueItems.length !== 1 ? 's' : ''} across {Object.keys(groupedItems).length} record{Object.keys(groupedItems).length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={() => setGroupByRecord(!groupByRecord)}
          className="text-xs text-primary hover:underline"
        >
          {groupByRecord ? 'Show all items' : 'Group by record'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Record</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Position</th>
              <th className="p-2 text-left">Joined</th>
            </tr>
          </thead>
          <tbody>
            {groupByRecord ? (
              // Grouped display - show just the first in queue for each record
              Object.entries(groupedItems).map(([releaseId, items]) => {
                const item = items[0]; // First item in queue
                const totalInQueue = items.length;
                const artistNames = item.release.artists
                  .map(artist => typeof artist === 'string' ? artist : artist.name)
                  .join(', ');
                
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2">
                      <div className="font-medium">{item.release.title}</div>
                      <div className="text-sm text-muted-foreground">{artistNames}</div>
                    </td>
                    <td className="p-2">
                      {item.user_alias}
                      {totalInQueue > 1 && (
                        <span className="ml-2">
                          <Badge variant="outline">+{totalInQueue - 1} more</Badge>
                        </span>
                      )}
                    </td>
                    <td className="p-2">#{item.queue_position}</td>
                    <td className="p-2">
                      {formatDistanceToNow(new Date(item.joined_at), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })
            ) : (
              // Detailed view - show all queue items
              queueItems.map(item => {
                const artistNames = item.release.artists
                  .map(artist => typeof artist === 'string' ? artist : artist.name)
                  .join(', ');
                
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2">
                      <div className="font-medium">{item.release.title}</div>
                      <div className="text-sm text-muted-foreground">{artistNames}</div>
                    </td>
                    <td className="p-2">{item.user_alias}</td>
                    <td className="p-2">#{item.queue_position}</td>
                    <td className="p-2">
                      {formatDistanceToNow(new Date(item.joined_at), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}