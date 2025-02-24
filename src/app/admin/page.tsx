'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store';
import { ReservationsTable } from '@/components/admin/ReservationsTable';
import { QueueTable } from '@/components/admin/QueueTable';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { SessionsTable } from '@/components/admin/SessionsTable';
import { AlertCircle, RotateCw, ShoppingBag } from 'lucide-react';

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
    
    // Set up a refresh interval for stats
    const intervalId = setInterval(fetchInitialData, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, [session]);

  if (admin.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-2">
          <RotateCw className="h-8 w-8 animate-spin text-primary" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (admin.error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p>Error: {admin.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sold Records
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between">
            <div className="text-2xl font-bold">{admin.stats.soldRecords}</div>
            <div className="text-sm text-muted-foreground">
              of {admin.stats.totalRecords} total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations & Queue */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Current Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationsTable />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Management</CardTitle>
          </CardHeader>
          <CardContent>
            <QueueTable />
          </CardContent>
        </Card>
      </div>

      {/* Activity Log & Sessions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityLog />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}