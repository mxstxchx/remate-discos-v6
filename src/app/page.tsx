'use client';

import { Suspense } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordGrid } from '@/components/records/RecordGrid';
import { useRecords } from '@/hooks/useRecords';
import { useStore } from '@/store';

export default function BrowsePage() {
  const { 
    releases, 
    loading, 
    error,
    totalPages 
  } = useRecords();
  
  const viewPreference = useStore(state => state.viewPreference);
  const setViewPreference = useStore(state => state.setViewPreference);
 
  const toggleView = () => {
    setViewPreference(viewPreference === 'grid' ? 'list' : 'grid');
  };
 
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-error">{error}</p>
      </div>
    );
  }
 
  return (
    <>
      <TopLayout />
      <div className="container mx-auto px-4 py-8 mt-16">
        <h1 className="text-2xl font-semibold mb-8">Browse Records</h1>

      <Suspense
        fallback={
          <RecordGrid
            records={[]}
            loading={true}
            variant={viewMode}
          />
        }
      >
        <RecordGrid
          records={releases}
          loading={loading}
          variant={viewMode}
        />
      </Suspense>
 
      <Button
        variant="default"
        size="icon"
        onClick={toggleView}
        className="fixed bottom-6 right-6 rounded-full shadow-lg"
      >
        {viewPreference === 'grid' ? (
          <List className="h-4 w-4" />
        ) : (
          <LayoutGrid className="h-4 w-4" />
        )}
      </Button>
    </div>
    </>
  );
 }