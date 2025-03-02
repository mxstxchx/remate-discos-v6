import { useEffect } from 'react';
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
import { formatPrice } from "@/lib/utils";
import { Mail, MessageCircle } from "lucide-react";
import { CART_CONFIG } from "@/lib/constants";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    release_id: number;
    title: string;
    price: number;
  }>;
  onWhatsApp: () => void;
  onEmail: () => void;
}

export function SuccessModal({
  isOpen,
  onClose,
  items,
  onWhatsApp,
  onEmail
}: SuccessModalProps) {
  const { t } = useTranslation();

  // Add debugging for modal state
  useEffect(() => {
    console.log('[SuccessModal] Modal state changed - isOpen:', isOpen, 'Items:', items.length);
  }, [isOpen, items]);
  const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
  
  const reservationDate = new Date();
  const expiryDate = new Date(reservationDate);
  expiryDate.setDate(reservationDate.getDate() + 7); // 7 days reservation period

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('checkout.success', 'Reservation Successful')}</DialogTitle>
          <DialogDescription>
            {t('checkout.success_description', 'Your items have been successfully reserved.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="font-medium mb-2">{t('checkout.reserved_items', 'Reserved Items')}:</h3>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item) => (
              <li key={item.release_id} className="flex justify-between text-sm border-b border-border pb-2">
                <span className="truncate mr-2">{item.title}</span>
                <span className="font-mono">{formatPrice(item.price || 0)}</span>
              </li>
            ))}
          </ul>
          
          <div className="flex justify-between mt-4 font-medium">
            <span>{t('checkout.total', 'Total')}:</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              {t('checkout.expiry_notice', 'Your reservation will expire on')}:
              <span className="font-medium text-foreground ml-1">
                {expiryDate.toLocaleDateString()}
              </span>
            </p>
            <p className="mt-2">
              {t('checkout.contact_instruction', 'Please contact us to coordinate pickup:')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex sm:flex-row gap-2">
          <Button 
            className="flex-1" 
            variant="outline" 
            onClick={onEmail}>
            <Mail className="mr-2 h-4 w-4" />
            {t('checkout.contact_email', 'Email')}
          </Button>
          <Button 
            className="flex-1" 
            onClick={onWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            {t('checkout.contact_whatsapp', 'WhatsApp')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
