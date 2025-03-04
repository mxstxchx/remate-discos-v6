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
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

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
  const { t, i18n } = useTranslation('checkout');

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
          <DialogTitle>{t('success.title')}</DialogTitle>
          <DialogDescription>
            {t('success.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="font-medium mb-2">{t('success.reserved_items')}:</h3>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item) => (
              <li key={item.release_id} className="flex justify-between text-sm border-b border-border pb-2">
                <span className="truncate mr-2">{item.title}</span>
                <span className="font-mono">{formatPrice(item.price || 0)}</span>
              </li>
            ))}
          </ul>
          
          <div className="flex justify-between mt-4 font-medium">
            <span>{t('success.total')}:</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              {t('success.expiry_notice')}:
              <span className="font-medium text-foreground ml-1">
                {expiryDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
              </span>
            </p>
            <p className="mt-2">
              {t('success.contact_instruction')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex sm:flex-row gap-2">
          <Button 
            className="flex-1" 
            variant="outline" 
            onClick={onEmail}>
            <Mail className="mr-2 h-4 w-4" />
            {t('success.contact_email')}
          </Button>
          <Button 
            className="flex-1" 
            onClick={onWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            {t('success.contact_whatsapp')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
