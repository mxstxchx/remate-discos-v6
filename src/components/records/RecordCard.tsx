import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useQueue } from '@/hooks/useQueue';
import { useStore } from '@/store';
import { Release, RecordStatus } from '@/types/database';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionButton } from './ActionButton';

const APP_LOG = '[APP:recordCard]';

interface RecordCardProps {
  record: Release;
  status?: RecordStatus;
  viewPreference?: 'grid' | 'list';
}

export const RecordCard = React.memo(function RecordCard({
  record,
  status, // Get status from props instead of store lookup
  viewPreference = 'grid'
}: RecordCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { joinQueue, leaveQueue } = useQueue();

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log(`${APP_LOG} Image load failed for record ${record.id}, falling back to thumb`);
    const img = e.target as HTMLImageElement;
    img.src = record.thumb || '/placeholder-image.jpg';
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addToCart(record.id);
      console.log('[CART] Added to cart:', record.id);
    } catch (error) {
      console.error('[CART] Failed to add to cart:', error);
    }
  };

  const handleJoinQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await joinQueue(record.id);
      console.log('[QUEUE] Joined queue for:', record.id);
    } catch (error) {
      console.error('[QUEUE] Failed to join queue:', error);
    }
  };

  const handleLeaveQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await leaveQueue(record.id);
      console.log('[QUEUE] Left queue for:', record.id);
    } catch (error) {
      console.error('[QUEUE] Failed to leave queue:', record.id);
    }
  };

  const handleCardClick = () => {
    router.push(`/${record.id}`);
  };

  if (viewPreference === 'grid') {
    return (
      <Card
        variant="vinyl"
        hover="lift"
        className={`h-full cursor-pointer ${
          status?.cartStatus === 'SOLD' ? 'opacity-75' : ''
        }`}
        onClick={handleCardClick}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-t-xl">
          <Image
            src={record.primary_image || record.thumb || '/placeholder-image.jpg'}
            alt={record.title}
            fill
            unoptimized={true}
            className="object-cover"
            onError={handleImageError}
          />
          <Badge
            variant="metallic"
            className="absolute top-2 right-2 backdrop-blur-sm"
          >
            {record.condition}
          </Badge>
        </div>

        <div className="flex flex-col flex-grow relative">
          <CardHeader>
            <CardTitle className="line-clamp-2">{record.title}</CardTitle>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <CardDescription className="truncate">
                  {record.artists.join(' / ')}
                </CardDescription>
                <div className="text-sm text-muted-foreground truncate">
                  {record.labels.map(l => `${l.name} - ${l.catno}`).join(' / ')}
                </div>
              </div>
              <span className="font-mono text-2xl font-semibold text-primary whitespace-nowrap shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                {Math.floor(record.price)}€
              </span>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-sm text-muted-foreground truncate">
              {record.styles.join(' / ')}
            </div>
          </CardContent>

          <CardFooter className="mt-auto">
            <div className="flex justify-end w-full" onClick={e => e.stopPropagation()}>
              <ActionButton
                recordId={record.id}
                status={status}
                onAddToCart={handleAddToCart}
                onJoinQueue={handleJoinQueue}
                onLeaveQueue={handleLeaveQueue}
                recordTitle={record.title}
                className="w-full"
              />
            </div>
          </CardFooter>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="metallic"
      hover="lift"
      className="flex flex-row p-3 gap-3 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="w-28 sm:w-32 flex-shrink-0">
        <div className="relative aspect-square w-full overflow-hidden rounded-md">
          <Image
            src={record.primary_image || record.thumb || '/placeholder-image.jpg'}
            alt={record.title}
            fill
            unoptimized={true}
            className="object-cover"
            onError={handleImageError}
          />
          <Badge
            variant="metallic"
            className="absolute top-2 right-2 backdrop-blur-sm"
          >
            {record.condition}
          </Badge>
          <div className="absolute -bottom-0 left-0 right-0 text-xs text-center text-muted-foreground bg-black/50 backdrop-blur-sm p-1 truncate md:hidden">
            {record.styles.join(' / ')}
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-grow min-w-0">
        <CardHeader className="p-0">
          <CardTitle className="line-clamp-2 mb-2">{record.title}</CardTitle>
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <CardDescription className="truncate">
                {record.artists.join(' / ')}
              </CardDescription>
              <div className="text-sm text-muted-foreground truncate">
                {record.labels.map(l => `${l.name} - ${l.catno}`).join(' / ')}
              </div>
            </div>
            <span className="text-2xl font-semibold text-primary whitespace-nowrap shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
              {Math.floor(record.price)}€
            </span>
          </div>
        </CardHeader>

        <div className="hidden md:block text-sm text-muted-foreground truncate">
          {record.styles.join(' / ')}
        </div>

        <CardFooter className="mt-auto p-0 pt-2">
          <div className="flex justify-end w-full" onClick={e => e.stopPropagation()}>
            <ActionButton
              recordId={record.id}
              status={status}
              onAddToCart={handleAddToCart}
              onJoinQueue={handleJoinQueue}
              onLeaveQueue={handleLeaveQueue}
              recordTitle={record.title}
              className="w-full"
            />
          </div>
        </CardFooter>
      </div>
    </Card>
  );
});

RecordCard.displayName = 'RecordCard';