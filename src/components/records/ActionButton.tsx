import React, { memo, useState } from 'react';
import { useRecordStatus, useSession } from '@/store';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, Users, Check, LogOut, Ban } from 'lucide-react';
import type { RecordStatus } from '@/types/database';
import { QueueExitModal } from './QueueExitModal';

interface ActionButtonProps {
  recordId: number;
  onAddToCart?: (e: React.MouseEvent) => void;
  onJoinQueue?: (e: React.MouseEvent) => void;
  onLeaveQueue?: (e: React.MouseEvent) => void;
  recordTitle: string;
  className?: string;
}

export const ActionButton = memo(function ActionButton({
  recordId,
  onAddToCart,
  onJoinQueue,
  onLeaveQueue,
  recordTitle,
  className = ''
}: ActionButtonProps) {
  const status = useRecordStatus(recordId);
  const session = useSession();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isHoveringQueue, setIsHoveringQueue] = useState(false);

  console.log('[ACTION_BUTTON] Status:', { recordId, status }); // Debug log

  const buttonStyles = {
    AVAILABLE: 'bg-primary hover:bg-primary/90',
    RESERVED_BY_OTHERS: 'bg-info hover:bg-info/90',
    RESERVED: 'bg-success hover:bg-success/90',
    IN_QUEUE: 'bg-muted hover:bg-destructive/90',
    IN_CART: 'bg-secondary hover:bg-secondary/90',
    SOLD: 'bg-muted/50 hover:bg-muted/50 cursor-not-allowed'
  };

  const currentStatus = status?.cartStatus || 'AVAILABLE';
  const isMyReservation = status?.reservation?.user_alias === session?.user_alias;

  const getButtonContent = () => {
    console.log('[ACTION_BUTTON] Getting content for status:', currentStatus); // Debug log

    switch (currentStatus) {
      case 'SOLD':
        return (
          <>
            <Ban className="mr-2 h-4 w-4" />
            Sold
          </>
        );
      case 'IN_CART':
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            In Cart
          </>
        );
      case 'IN_QUEUE':
        return isHoveringQueue ? (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            Leave Queue
          </>
        ) : (
          <>
            <Clock className="mr-2 h-4 w-4" />
            Position {status?.queuePosition}
          </>
        );
      case 'RESERVED':
        return isMyReservation ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Reserved
          </>
        ) : (
          <>
            <Users className="mr-2 h-4 w-4" />
            Join Queue
          </>
        );
      case 'RESERVED_BY_OTHERS':
        return (
          <>
            <Users className="mr-2 h-4 w-4" />
            Join Queue
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[ACTION_BUTTON] Click with status:', currentStatus); // Debug log
    
    if (currentStatus === 'AVAILABLE') {
      onAddToCart?.(e);
    } else if (currentStatus === 'RESERVED_BY_OTHERS' ||
               (currentStatus === 'RESERVED' && !isMyReservation)) {
      onJoinQueue?.(e);
    } else if (currentStatus === 'IN_QUEUE' && isHoveringQueue) {
      setShowExitModal(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={currentStatus === 'RESERVED' && isMyReservation}
        className={`flex-1 ${buttonStyles[currentStatus]} ${className}`}
        onMouseEnter={() => currentStatus === 'IN_QUEUE' && setIsHoveringQueue(true)}
        onMouseLeave={() => setIsHoveringQueue(false)}
      >
        {getButtonContent()}
      </Button>

      <QueueExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={async () => {
          await onLeaveQueue?.(new MouseEvent('click') as any);
          setShowExitModal(false);
        }}
        recordTitle={recordTitle}
      />
    </>
  );
});

ActionButton.displayName = 'ActionButton';