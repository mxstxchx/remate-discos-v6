import React, { memo } from 'react';
import { useRecordStatus } from '@/store';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, Users } from 'lucide-react';

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

  const buttonStyles = {
    AVAILABLE: 'bg-primary hover:bg-primary/90',
    RESERVED_BY_OTHERS: 'bg-info hover:bg-info/90',
    IN_QUEUE: 'bg-muted hover:bg-muted/90',
    RESERVED: 'bg-success hover:bg-success/90'
  };

  // Default to AVAILABLE if no status is found
  const currentStatus = status?.cartStatus || 'AVAILABLE';

  const getButtonContent = () => {
    switch (currentStatus) {
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
      case 'RESERVED':
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Reserved
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
    switch (currentStatus) {
      case 'AVAILABLE':
        onAddToCart?.();
        break;
      case 'RESERVED_BY_OTHERS':
        onJoinQueue?.();
        break;
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={currentStatus === 'IN_QUEUE' || currentStatus === 'RESERVED'}
      className={`flex-1 ${buttonStyles[currentStatus]} ${className}`}
    >
      {getButtonContent()}
    </Button>
  );
});