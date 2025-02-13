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
  
  const viewMode = useStore(state => state.viewMode);
  const setViewMode = useStore(state => state.setViewMode);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Browse Records</h1>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="hidden md:flex"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
    </div>
  );
}