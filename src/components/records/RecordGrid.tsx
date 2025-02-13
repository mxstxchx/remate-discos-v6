import { RecordCard } from './RecordCard';
import { Release } from '@/store/recordsSlice';
import { Skeleton } from '@/components/ui/skeleton';

interface RecordGridProps {
  records: Release[];
  loading?: boolean;
  variant?: 'grid' | 'list';
}

export function RecordGrid({ records = [], loading = false, variant = 'grid' }: RecordGridProps) {
  if (loading) {
    return (
      <div className={
        variant === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'flex flex-col gap-6'
      }>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={variant === 'grid' ? 'aspect-[3/4]' : 'h-48'}>
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!records?.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No records found</p>
      </div>
    );
  }

  return (
    <div className={
      variant === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        : 'flex flex-col gap-6'
    }>
      {records.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          variant={variant}
        />
      ))}
    </div>
  );
}