import React, { memo } from 'react';
import { useRecordStatus } from '@/hooks/useRecordStatus';
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

  if (!status) return null;

  const buttonStyles = {
    AVAILABLE: 'bg-primary hover:bg-primary/90',
    RESERVED: 'bg-info hover:bg-info/90',
    IN_QUEUE: 'bg-muted hover:bg-muted/90'
  };

  const getButtonContent = () => {
    switch (status.type) {
      case 'AVAILABLE':
        return (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </>
        );
      case 'RESERVED':
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
            In Queue
          </>
        );
    }
  };

  const handleClick = () => {
    switch (status.type) {
      case 'AVAILABLE':
        onAddToCart?.();
        break;
      case 'RESERVED':
        onJoinQueue?.();
        break;
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={status.type === 'IN_QUEUE'}
      className={`flex-1 ${buttonStyles[status.type]} ${className}`}
    >
      {getButtonContent()}
    </Button>
  );
});