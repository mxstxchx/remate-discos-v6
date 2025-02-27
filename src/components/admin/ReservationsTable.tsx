'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useStore } from '@/store';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Clock, Check, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Reservation {
  id: string;
  release_id: number;
  user_alias: string;
  status: 'RESERVED' | 'SOLD';
  expires_at: string;
  created_at: string;
  queue_size: number;
  release: {
    id: number;
    title: string;
    artists: Array<{ name: string }>;
    price: number;
    condition: string;
  };
}

export function ReservationsTable() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const session = useStore(state => state.session);
  const { toast } = useToast();

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/reservations', {
        headers: {
          'X-User-Alias': session?.user_alias || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }
      
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load reservations'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user_alias) {
      fetchReservations();
      
      // Set up real-time subscription
      const supabase = createClientComponentClient();
      const subscription = supabase
        .channel('admin-reservations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations'
          },
          () => {
            console.log('[ADMIN] Reservation change detected, refreshing...');
            fetchReservations();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [session?.user_alias]);

  const handleExpireReservation = async (id: string) => {
    try {
      const response = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: {
          'X-User-Alias': session?.user_alias || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to expire reservation');
      }
      
      toast({
        title: 'Success',
        description: 'Reservation expired successfully'
      });
      
      // Refresh the list
      fetchReservations();
    } catch (error) {
      console.error('Error expiring reservation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to expire reservation'
      });
    }
  };

  const handleMarkAsSold = async (releaseId: number) => {
    try {
      // Add a notes parameter with a default value (null)
      const response = await fetch('/api/admin/mark-sold', {
        method: 'POST',
        headers: {
          'X-User-Alias': session?.user_alias || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ releaseId, notes: null })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark as sold');
      }
      
      toast({
        title: 'Success',
        description: 'Record marked as sold successfully'
      });
      
      // Refresh the list
      fetchReservations();
    } catch (error) {
      console.error('Error marking as sold:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark record as sold'
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading reservations...</div>;
  }

  if (reservations.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No active reservations</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left">Record</th>
            <th className="p-2 text-left">User</th>
            <th className="p-2 text-left">Reserved</th>
            <th className="p-2 text-left">Expires</th>
            <th className="p-2 text-left">Queue</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map(reservation => {
            const artistNames = reservation.release.artists
              .map(artist => typeof artist === 'string' ? artist : artist.name)
              .join(', ');
              
            return (
              <tr key={reservation.id} className="border-b border-border hover:bg-muted/50">
                <td className="p-2">
                  <div className="font-medium">{reservation.release.title}</div>
                  <div className="text-sm text-muted-foreground">{artistNames}</div>
                </td>
                <td className="p-2">{reservation.user_alias}</td>
                <td className="p-2">
                  {formatDistanceToNow(new Date(reservation.created_at), { addSuffix: true })}
                </td>
                <td className="p-2">
                  {formatDistanceToNow(new Date(reservation.expires_at), { addSuffix: true })}
                </td>
                <td className="p-2">
                  {reservation.queue_size > 0 ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {reservation.queue_size}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </td>
                <td className="p-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExpireReservation(reservation.id)}
                      title="Expire reservation"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleMarkAsSold(reservation.release.id)}
                      title="Mark as sold"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}