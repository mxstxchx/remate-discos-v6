'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store';

export default function AdminDashboard() {
  const session = useStore(state => state.session);
  const admin = useStore(state => state.admin);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            'X-User-Alias': session?.user_alias || ''
          }
        });
        const data = await response.json();
        useStore.setState(state => ({
          admin: {
            ...state.admin,
            stats: data,
            isLoading: false
          }
        }));
      } catch (error) {
        useStore.setState(state => ({
          admin: {
            ...state.admin,
            error: 'Failed to fetch stats',
            isLoading: false
          }
        }));
      }
    };

    fetchInitialData();
  }, []);

  if (admin.isLoading) {
    return <div>Loading...</div>;
  }

  if (admin.error) {
    return <div>Error: {admin.error}</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admin.stats.activeReservations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Queued Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admin.stats.queuedItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admin.stats.activeSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content sections placeholder */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {/* ReservationsTable component will go here */}
            <p className="text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Management</CardTitle>
          </CardHeader>
          <CardContent>
            {/* QueueTable component will go here */}
            <p className="text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}