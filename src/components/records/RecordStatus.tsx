import React, { memo } from 'react';
import { useStore } from '@/store';
import { Badge } from '@/components/ui/badge';

interface RecordStatusProps {
  recordId: number;
  showReservedBy?: boolean;
  className?: string;
}

export const RecordStatus = memo(function RecordStatus({
  recordId,
  showReservedBy = false,
  className = ''
}: RecordStatusProps) {
  // Use global status from store instead of individual hook
  const status = useStore(state => state.recordStatuses[recordId]);

  if (!status) return null;

  const statusStyles = {
    AVAILABLE: 'bg-success text-success-foreground',
    RESERVED: 'bg-info text-info-foreground',
    IN_QUEUE: 'bg-muted text-muted-foreground',
    RESERVED_BY_OTHERS: 'bg-warning text-warning-foreground',
    SOLD: 'bg-destructive text-destructive-foreground'
  };

  return (
    <Badge
      variant="secondary"
      className={`${statusStyles[status.cartStatus as keyof typeof statusStyles]} ${className}`}
    >
      {status.cartStatus}
      {showReservedBy && status.reservation?.user_alias && (
        <span className="ml-2 text-xs opacity-80">
          by {status.reservation.user_alias}
        </span>
      )}
    </Badge>
  );
});