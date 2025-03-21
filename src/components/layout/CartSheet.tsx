import { useTypedTranslation } from '@/i18n/utils';
import { useEffect, useState } from 'react';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCheckout } from '@/hooks/useCheckout';
import { formatPrice } from '@/lib/utils';
import { SuccessModal } from '@/components/cart/SuccessModal';
import { useToast } from "@/components/ui/use-toast";
import { CheckoutModal } from '@/components/cart/CheckoutModal';

const getStatusVariant = (status: string) => {
  console.log('[Cart_Items] Getting badge variant for status:', status);
  switch (status) {
    case 'AVAILABLE':
      return 'default';
    case 'IN_QUEUE':
      return 'secondary';
    case 'RESERVED':
      return 'success';
    case 'RESERVED_BY_OTHERS':
      return 'destructive';
    case 'IN_CART':
      return 'outline';
    default:
      return 'secondary';
  }
};

export function CartSheet() {
  const { toast } = useToast();
  const { t } = useTypedTranslation();
  const { items, removeFromCart, lastValidated } = useCart();
  const { 
    handleCheckout, 
    isLoading: checkoutLoading, 
    showModal, 
    setShowModal, 
    showSuccessModal, 
    setShowSuccessModal, 
    modalActions, 
    reservedItems,
    queuedItems,
    handleWhatsAppContact, 
    handleEmailContact 
  } = useCheckout();

  // Track if cart should stay open after checkout
  const [keepOpen, setKeepOpen] = useState(false);
  
  // Track sold items for the modal
  const [soldItems, setSoldItems] = useState<Array<{
    release_id: number;
    title: string;
    price?: number;
  }>>([]);

  // If success modal is showing, keep the cart sheet open
  useEffect(() => {
    if (showSuccessModal) {
      setKeepOpen(true);
      console.log('[CartSheet] Setting keepOpen true due to success modal');
    } else {
      setKeepOpen(false);
      console.log('[CartSheet] Setting keepOpen false');
    }
  }, [showSuccessModal]);

  // Log cart items when they change
  useEffect(() => {
    console.log('[Cart_Items] CartSheet items:', {
      count: items.length,
      items: items.map(item => ({
        id: item.release_id,
        title: item.releases?.title,
        status: item.status,
        queuePosition: item.queue_position || null
      }))
    });
  }, [items]);

  const total = items.reduce((sum, item) => sum + (item.releases?.price || 0), 0);

  const handleRemoveItem = async (recordId: number) => {
    try {
      await removeFromCart(recordId);
    } catch (error) {
      console.error('[Cart_Items] Failed to remove item:', error);
    }
  };

  return (
    <>
      <SheetContent forceMount={keepOpen as true}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t('cart.title', { ns: 'checkout' })}
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {items.length}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground">
              {t('cart.empty', { ns: 'checkout' })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.releases?.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.releases?.price || 0)}
                      </p>
                      <Badge
                        variant={getStatusVariant(item.status)}
                        className="mt-2"
                      >
                        {item.status === 'IN_QUEUE' ? (
                          <>{t('status.queue_position', { position: item.queue_position || 0, ns: 'common' })}</>
                        ) : (
                          t(`status.${item.status.toLowerCase()}`, { defaultValue: item.status, ns: 'common' })
                        )}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.release_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <CheckoutModal
              isOpen={showModal}
              onClose={() => {
                setShowModal(false);
                modalActions.cancel();
              }}
              onConfirm={async () => {
                modalActions.confirm();
              }}
              items={items}
              reservedItems={reservedItems}
              soldItems={soldItems}
            />

            <div className="border-t pt-4 space-y-4">
              {lastValidated && (
                <div className="text-xs text-muted-foreground text-center">
                  {t('last_validated', {ns: 'common'})} {new Date(lastValidated).toLocaleTimeString()}
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">
                  {t('cart.total', { ns: 'checkout' })}
                </span>
                <span className="font-mono text-lg">
                  {formatPrice(total)}
                </span>
              </div>
              
              <Button
                className="w-full"
                size="lg"
                onClick={async () => {
                  try {
                    const result = await handleCheckout();
                    if (result && result.success) {
                      // Update soldItems state if there are any
                      if (result.soldItems && result.soldItems.length > 0) {
                        setSoldItems(result.soldItems);
                        console.log('[CartSheet] Found sold items in cart:', result.soldItems);
                      }
                      
                      // Show success toast with appropriate message
                      toast({
                        title: result && result.hasConflicts ? t('toast.partial_success', { ns: 'checkout' }) : t('toast.success', { ns: 'checkout' }),
                        description: result ? result.message : t('toast.unknown_error', { ns: 'checkout' }),
                        variant: result && result.hasConflicts ? "warning" : "success",
                      });
                    } else {
                      // Show error toast
                      toast({
                        title: t('toast.error', { ns: 'checkout' }),
                        description: result ? result.message : t('toast.unknown_error', { ns: 'checkout' }),
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    // Show error toast for unexpected errors
                    toast({
                      title: t('toast.error', { ns: 'checkout' }),
                      description: t('toast.unexpected_error', { ns: 'checkout' }),
                      variant: "destructive",
                    });
                  }
                }}
                disabled={checkoutLoading}
              >
                {checkoutLoading ?
                  t('cart.processing', { defaultValue: 'Processing...', ns: 'checkout' }) :
                  t('cart.checkout', { defaultValue: 'Checkout', ns: 'checkout' })}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
      
      {/* Success modal rendered outside SheetContent for visibility */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        items={reservedItems}
        onWhatsApp={handleWhatsAppContact}
        onEmail={handleEmailContact}
      />
    </>
  );
}
