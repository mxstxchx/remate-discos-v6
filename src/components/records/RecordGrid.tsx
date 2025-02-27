import { RecordCard } from './RecordCard';
import { Release } from '@/store/recordsSlice';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/store';
import { useMemo, useEffect } from 'react';

interface RecordGridProps {
  records: Release[];
  loading?: boolean;
  viewPreference?: 'grid' | 'list';
}

export function RecordGrid({ records = [], loading = false, viewPreference = 'grid' }: RecordGridProps) {
  const recordStatuses = useStore(state => state.recordStatuses);
  
  // Debug: Log status availability for monitoring
  useEffect(() => {
    if (records.length > 0) {
      // Check for a specific known sold record if available
      const soldRecordId = 13255050; // Example ID you mentioned
      const soldRecord = records.find(r => r.id === soldRecordId);
      
      if (soldRecord) {
        console.log(`[RG_FIX] Found record ${soldRecordId} in records array`);
        console.log(`[RG_FIX] Record data:`, {
          id: soldRecord.id,
          title: soldRecord.title,
          visibility: soldRecord.visibility,
          sold_at: soldRecord.sold_at
        });
        
        const status = recordStatuses[soldRecordId];
        console.log(`[RG_FIX] Status for record ${soldRecordId}:`, status);
      }
    }
  }, [records, recordStatuses]);
  
  // Filter out sold records and those marked not visible
  const visibleRecords = useMemo(() => {
    console.log(`[RG_FIX] Filtering ${records.length} records`);
    
    return records.filter(record => {
      // Check for visibility in the record itself
      const isHidden = record.visibility === false || record.sold_at !== null;
      
      // Check status for SOLD flag
      const status = recordStatuses[record.id];
      const isSold = status?.cartStatus === 'SOLD';
      
      // Log details for filtered records
      if (isHidden || isSold) {
        console.log(`[RG_FIX] Filtering out record ${record.id}:`, { 
          visibility: record.visibility, 
          sold_at: record.sold_at,
          statusCartStatus: status?.cartStatus
        });
        return false;
      }
      
      return true;
    });
  }, [records, recordStatuses]);
  
  console.log(`[RG_FIX] Displaying ${visibleRecords.length} of ${records.length} total records`);

  if (loading) {
    return (
      <div className={
        viewPreference === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'flex flex-col gap-6'
      }>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={viewPreference === 'grid' ? 'aspect-[3/4]' : 'h-48'}>
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!visibleRecords?.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No records found</p>
      </div>
    );
  }

  return (
    <div className={
      viewPreference === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        : 'flex flex-col gap-6'
    }>
      {visibleRecords.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          status={recordStatuses[record.id]}
          viewPreference={viewPreference}
        />
      ))}
    </div>
  );
}