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
  const { t } = useTranslation('checkout');

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('conflict.title')}</DialogTitle>
          <DialogDescription>
            {t('conflict.description')}
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
            {t('conflict.queue_question')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('conflict.cancel')}
          </Button>
          <Button onClick={handleConfirm}>
            {t('conflict.join_queue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}