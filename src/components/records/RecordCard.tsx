import React from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useQueue } from '@/hooks/useQueue';
import { Release } from '@/store/recordsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionButton } from './ActionButton';

const APP_LOG = '[APP:recordCard]';

interface RecordCardProps {
  record: Release;
  viewPreference?: 'grid' | 'list';
}

export const RecordCard = React.memo(function RecordCard({
  record,
  viewPreference = 'grid'
}: RecordCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { joinQueue, leaveQueue } = useQueue();

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log(`${APP_LOG} Image load failed for record ${record.id}, falling back to thumb`);
    const img = e.target as HTMLImageElement;
    img.src = record.thumb;
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
      console.error('[QUEUE] Failed to leave queue:', error);
    }
  };

  const handleCardClick = () => {
    router.push(`/${record.id}`);
  };

  if (viewPreference === 'grid') {
    return (
      <Card
        className={`h-full bg-card hover:bg-muted transition-colors cursor-pointer ${
          status?.cartStatus === 'SOLD' ? 'opacity-75' : ''
        }`}
        onClick={handleCardClick}
      >
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

        <div className="flex flex-col flex-grow">
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
              <span className="font-mono text-2xl font-semibold text-primary whitespace-nowrap shrink-0">
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
      className="flex flex-row bg-card hover:bg-muted transition-colors p-3 gap-3 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="w-28 sm:w-32 flex-shrink-0">
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
            <span className="font-mono text-2xl font-semibold text-primary whitespace-nowrap shrink-0">
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