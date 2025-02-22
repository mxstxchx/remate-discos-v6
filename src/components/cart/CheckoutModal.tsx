import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { CartItem } from "@/types/database";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  items: CartItem[];
  reservedItems: Array<{
    release_id: number;
    title: string;
  }>;
}

export function CheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  reservedItems
}: CheckoutModalProps) {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Items No Longer Available</DialogTitle>
          <DialogDescription>
            The following items have been reserved by other users:
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <ul className="space-y-2">
            {reservedItems.map((item) => (
              <li key={item.release_id} className="text-sm">
                • {item.title}
              </li>
            ))}
          </ul>
          
          <p className="mt-4 text-sm text-muted-foreground">
            Would you like to join the queue for these items? You will be notified when they become available.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Join Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}