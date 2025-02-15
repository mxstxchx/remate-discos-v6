import React, { memo } from 'react';
import { useRecordStatus } from '@/hooks/useRecordStatus';
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
  const status = useRecordStatus(recordId);

  if (!status) return null;

  const statusStyles = {
    AVAILABLE: 'bg-success text-success-foreground',
    RESERVED: 'bg-info text-info-foreground',
    IN_QUEUE: 'bg-muted text-muted-foreground'
  };

  return (
    <Badge
      variant="secondary"
      className={`${statusStyles[status.type as keyof typeof statusStyles]} ${className}`}
    >
      {status.type}
      {showReservedBy && status.reservedBy && (
        <span className="ml-2 text-xs opacity-80">
          by {status.reservedBy}
        </span>
      )}
    </Badge>
  );
});