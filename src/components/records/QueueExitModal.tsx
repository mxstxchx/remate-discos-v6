import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QueueExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  recordTitle: string;
}

export function QueueExitModal({
  isOpen,
  onClose,
  onConfirm,
  recordTitle
}: QueueExitModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Queue?</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave the queue for "{recordTitle}"? If you join the queue again later, you will be placed at the end of the queue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            Leave Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}