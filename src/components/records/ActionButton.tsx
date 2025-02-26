import React, { memo, useState, useMemo } from 'react';
import { useSession, useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, Users, Check, LogOut, Ban } from 'lucide-react';
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
  // Use global status from store instead of individual hook
  const status = useStore(state => state.recordStatuses[recordId]);
  const session = useSession();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isHoveringQueue, setIsHoveringQueue] = useState(false);

  // Improved status determination logic
  const currentStatus = useMemo(() => {
    if (!status) {
      console.log(`[AB_FIX] No status for record ${recordId}, defaulting to AVAILABLE`);
      return 'AVAILABLE';
    }
    
    // Priority 1: Check for queue position - if user is in a queue, this takes precedence
    if (status.queuePosition !== undefined && status.queuePosition !== null) {
      console.log(`[AB_FIX] Record ${recordId} has queue position ${status.queuePosition}, using IN_QUEUE status`);
      return 'IN_QUEUE';
    }
    
    // Priority 2: Use cartStatus
    console.log(`[AB_FIX] Record ${recordId} using cartStatus: ${status.cartStatus}`);
    return status.cartStatus || 'AVAILABLE';
  }, [recordId, status]);
  
  const isMyReservation = status?.reservation?.user_alias === session?.user_alias;

  // Map status to button variants and LED colors
  const getButtonConfig = () => {
    switch (currentStatus) {
      case 'SOLD':
        return { variant: 'secondary', led: 'off', ledColor: 'none' };
      case 'IN_CART':
        return { variant: 'knurled', led: 'off', ledColor: 'none' };
      case 'IN_QUEUE':
        return { 
          variant: 'led', 
          led: undefined, 
          ledColor: isHoveringQueue ? 'error' : 'warning'
        };
      case 'RESERVED':
        return { 
          variant: isMyReservation ? 'led' : 'knurled', 
          led: undefined, 
          ledColor: isMyReservation ? 'success' : 'none'
        };
      case 'RESERVED_BY_OTHERS':
        return { variant: 'knurled', led: 'off', ledColor: 'none' };
      default: // AVAILABLE
        return { variant: 'default', led: 'off', ledColor: 'none' };
    }
  };

  const buttonConfig = getButtonConfig();

  const getButtonContent = () => {
    switch (currentStatus) {
      case 'SOLD':
        return (
          <>
            <Ban className="mr-2 h-4 w-4" />
            <span className="font-heading">Sold</span>
          </>
        );
      case 'IN_CART':
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span className="font-heading">In Cart</span>
          </>
        );
      case 'IN_QUEUE':
        return isHoveringQueue ? (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-heading">Leave Queue</span>
          </>
        ) : (
          <>
            <Clock className="mr-2 h-4 w-4" />
            <span className="font-heading">Position {status?.queuePosition}</span>
          </>
        );
      case 'RESERVED':
        return isMyReservation ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            <span className="font-heading">Reserved</span>
          </>
        ) : (
          <>
            <Users className="mr-2 h-4 w-4" />
            <span className="font-heading">Join Queue</span>
          </>
        );
      case 'RESERVED_BY_OTHERS':
        return (
          <>
            <Users className="mr-2 h-4 w-4" />
            <span className="font-heading">Join Queue</span>
          </>
        );
      default: // AVAILABLE
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span className="font-heading">Add to Cart</span>
          </>
        );
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[AB_FIX] Button clicked for record ${recordId} with status: ${currentStatus}`);
    
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
        variant={buttonConfig.variant}
        ledColor={buttonConfig.ledColor}
        className={`${className} font-heading`}
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