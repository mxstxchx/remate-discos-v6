import React from 'react';
import Image from 'next/image';
import { Release } from '@/store/recordsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionButton } from './ActionButton';

const APP_LOG = '[APP:recordCard]';

interface RecordCardProps {
  record: Release;
  variant?: 'grid' | 'list';
  onAddToCart?: () => void;
  onJoinQueue?: () => void;
}

export const RecordCard = React.memo(function RecordCard({
  record,
  variant = 'grid',
  onAddToCart,
  onJoinQueue
}: RecordCardProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log(`${APP_LOG} Image load failed for record ${record.id}, falling back to thumb`);
    const img = e.target as HTMLImageElement;
    img.src = record.thumb;
  };

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
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-black/50 text-white backdrop-blur-sm"
          >
            {record.condition}
          </Badge>
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
          <div className="flex items-center w-full gap-3">
            <ActionButton
              recordId={record.id}
              onAddToCart={onAddToCart}
              onJoinQueue={onJoinQueue}
            />
            <span className="font-mono text-lg font-semibold text-primary whitespace-nowrap">
              {Math.floor(record.price)}€
            </span>
          </div>
        </CardFooter>
      </div>
    </Card>
  );
});