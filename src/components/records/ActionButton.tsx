import React, { memo } from 'react';
import { useRecordStatus, useSession } from '@/store';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, Users, Check } from 'lucide-react';
import type { RecordStatus } from '@/types/database';

interface ActionButtonProps {
  recordId: number;
  onAddToCart?: () => void;
  onJoinQueue?: () => void;
  className?: string;
}

export const ActionButton = memo(function ActionButton({
  recordId,
  onAddToCart,
  onJoinQueue,
  className = ''
}: ActionButtonProps) {
  const status = useRecordStatus(recordId);
  const session = useSession();

  const buttonStyles = {
    AVAILABLE: 'bg-primary hover:bg-primary/90',
    RESERVED_BY_OTHERS: 'bg-info hover:bg-info/90',
    RESERVED: 'bg-success hover:bg-success/90',
    IN_QUEUE: 'bg-muted hover:bg-muted/90'
  };

  // Default to AVAILABLE if no status is found
  const currentStatus = status?.cartStatus || 'AVAILABLE';
  const isMyReservation = status?.reservation?.user_alias === session?.user_alias;

  const getButtonContent = () => {
    switch (currentStatus) {
      case 'RESERVED':
        return (
          <>
            {isMyReservation ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Reserved
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Join Queue
              </>
            )}
          </>
        );
      case 'RESERVED_BY_OTHERS':
        return (
          <>
            <Users className="mr-2 h-4 w-4" />
            Join Queue
          </>
        );
      case 'IN_QUEUE':
        return (
          <>
            <Clock className="mr-2 h-4 w-4" />
            Position {status?.queuePosition}
          </>
        );
      default: // AVAILABLE
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </>
        );
    }
  };

  const handleClick = () => {
    if (currentStatus === 'AVAILABLE') {
      onAddToCart?.();
    } else if (currentStatus === 'RESERVED_BY_OTHERS' ||
               (currentStatus === 'RESERVED' && !isMyReservation)) {
      onJoinQueue?.();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={currentStatus === 'IN_QUEUE' || (currentStatus === 'RESERVED' && isMyReservation)}
      className={`flex-1 ${buttonStyles[currentStatus]} ${className}`}
    >
      {getButtonContent()}
    </Button>
  );
});

ActionButton.displayName = 'ActionButton';