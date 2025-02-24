'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/store';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    // Redirect non-admin users
    if (session && !session.metadata?.is_admin) {
      router.replace('/');
    }
  }, [session, router]);

  // Show nothing while checking auth
  if (!session || !session.metadata?.is_admin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container py-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View Store
          </button>
        </header>
        {children}
      </div>
    </main>
  );
}