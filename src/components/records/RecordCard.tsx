import React from 'react';
import Image from 'next/image';
import { Release } from '@/store/recordsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecordStatus } from '@/hooks/useRecordStatus';
import { RecordStatus } from './RecordStatus';

const APP_LOG = '[APP:recordCard]';

interface RecordCardProps {
  record: Release;
  variant?: 'grid' | 'list';
}

export const RecordCard = React.memo(function RecordCard({
  record,
  variant = 'grid'
}: RecordCardProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log(`${APP_LOG} Image load failed for record ${record.id}, falling back to thumb`);
    const img = e.target as HTMLImageElement;
    img.src = record.thumb;
  };

  console.log(`${APP_LOG} Rendering record ${record.id}`);

  return (
    <Card className={
      variant === 'grid'
        ? 'h-full bg-card hover:bg-muted transition-colors'
        : 'flex flex-row bg-card hover:bg-muted transition-colors'
    }>
      <div className={variant === 'list' ? 'w-48 flex-shrink-0' : ''}>
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={record.primary_image || record.thumb}
            alt={record.title}
            fill
            className="object-cover"
            onError={handleImageError}
          />
          <RecordStatus
            recordId={record.id}
            className="absolute top-2 right-2"
          />
        </div>
      </div>

      <div className="flex flex-col flex-grow">
        <CardHeader>
          <CardTitle className="line-clamp-2">{record.title}</CardTitle>
          <CardDescription>
            {record.artists.join(' / ')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div>{record.labels.map(l => `${l.name} - ${l.catno}`).join(' / ')}</div>
            <div>{record.styles.join(' / ')}</div>
          </div>
        </CardContent>

        <CardFooter className="mt-auto">
          <div className="flex justify-between items-center w-full">
            <span className="font-mono text-lg font-semibold text-primary">
              {record.price.toFixed(2)}€
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {record.condition}
            </span>
          </div>
        </CardFooter>
      </div>
    </Card>
  );
});