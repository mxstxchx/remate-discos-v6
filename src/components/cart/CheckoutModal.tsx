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
    price?: number;
  }>;
  soldItems?: Array<{
    release_id: number;
    title: string;
    price?: number;
  }>;
}

export function CheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  reservedItems,
  soldItems = []
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
          {reservedItems.length > 0 && (
            <>
              <h4 className="font-medium text-sm mb-2">{t('conflict.reserved_by_others')}:</h4>
              <ul className="space-y-2 mb-4">
                {reservedItems.map((item) => (
                  <li key={item.release_id} className="text-sm">
                    • {item.title}
                  </li>
                ))}
              </ul>
            </>
          )}
          
          {soldItems.length > 0 && (
            <>
              <h4 className="font-medium text-sm mb-2">{t('conflict.sold_items')}:</h4>
              <ul className="space-y-2 mb-4">
                {soldItems.map((item) => (
                  <li key={item.release_id} className="text-sm">
                    • {item.title}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mb-4">
                {t('conflict.sold_explanation')}
              </p>
            </>
          )}
          
          {reservedItems.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t('conflict.queue_question')}
            </p>
          )}
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