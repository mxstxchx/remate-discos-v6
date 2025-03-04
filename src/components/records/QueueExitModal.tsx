import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('checkout');
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('queue_exit.title')}</DialogTitle>
          <DialogDescription>
            {t('queue_exit.description', { title: recordTitle })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('queue_exit.cancel')}</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              console.log('[MODAL] Leave Queue button clicked for:', recordTitle);
              try {
                await onConfirm();
                console.log('[MODAL] onConfirm completed successfully');
              } catch (error) {
                console.error('[MODAL] Error in onConfirm:', error);
              } finally {
                console.log('[MODAL] Closing modal');
                onClose();
              }
            }}
          >
            {t('queue_exit.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}