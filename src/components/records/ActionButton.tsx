import React, { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession, useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, Users, Check, LogOut, Ban } from 'lucide-react';
import { QueueExitModal } from './QueueExitModal';

interface ActionButtonProps {
  recordId: number;
  status?: RecordStatus; // Add status prop
  onAddToCart?: (e: React.MouseEvent) => void;
  onJoinQueue?: (e: React.MouseEvent) => void;
  onLeaveQueue?: (e: React.MouseEvent) => void;
  recordTitle: string;
  className?: string;
}

export const ActionButton = memo(function ActionButton({
  recordId,
  status, // Get status from props
  onAddToCart,
  onJoinQueue,
  onLeaveQueue,
  recordTitle,
  className = ''
}: ActionButtonProps) {
  const session = useSession();
  const { t } = useTranslation('checkout');
  const [showExitModal, setShowExitModal] = useState(false);
  const [isHoveringQueue, setIsHoveringQueue] = useState(false);

  // Improved status determination logic
  const currentStatus = useMemo(() => {
    if (!status) {
      console.log(`[AB_FIX] No status for record ${recordId}, defaulting to AVAILABLE`);
      return 'AVAILABLE';
    }
    
    console.log(`[AB_FIX] Determining status for record ${recordId}:`, {
      hasQueuePosition: status.queuePosition !== undefined && status.queuePosition !== null,
      queuePosition: status.queuePosition,
      inCart: status.inCart,
      cartStatus: status.cartStatus,
      hasReservation: !!status.reservation,
      reservation: status.reservation,
      isMyReservation: status.reservation?.user_alias === session?.user_alias
    });
    
    // Priority 1: Check for queue position - if user is in a queue, this takes precedence
    if (status.queuePosition !== undefined && status.queuePosition !== null) {
      console.log(`[AB_FIX] Record ${recordId} has queue position ${status.queuePosition}, using IN_QUEUE status`);
      return 'IN_QUEUE';
    }
    
    // Priority 2: Check if item is in cart
    if (status.inCart) {
      console.log(`[AB_FIX] Record ${recordId} is in cart, using IN_CART status`);
      return 'IN_CART';
    }
    
    // Priority 3: Use cartStatus
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
            <span className="font-heading">{t('status.sold')}</span>
          </>
        );
      case 'IN_CART':
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span className="font-heading">{t('status.in_cart')}</span>
          </>
        );
      case 'IN_QUEUE':
        return isHoveringQueue ? (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-heading">{t('status.leave_queue')}</span>
          </>
        ) : (
          <>
            <Clock className="mr-2 h-4 w-4" />
            <span className="font-heading">{t('status.queue_position', { position: status?.queuePosition })}</span>
          </>
        );
      case 'RESERVED':
        return isMyReservation ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            <span className="font-heading">{t('status.reserved')}</span>
          </>
        ) : (
          <>
            <Users className="mr-2 h-4 w-4" />
            <span className="font-heading">{t('status.join_queue')}</span>
          </>
        );
      case 'RESERVED_BY_OTHERS':
        return (
          <>
            <Users className="mr-2 h-4 w-4" />
            <span className="font-heading">{t('status.join_queue')}</span>
          </>
        );
      default: // AVAILABLE
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span className="font-heading">{t('status.available')}</span>
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