import { useTranslation } from 'react-i18next';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCheckout } from '@/hooks/useCheckout';
import { formatPrice } from '@/lib/utils';

export function CartSheet() {
  const { t } = useTranslation();
  const { items, removeFromCart } = useCart();
  const { handleCheckout, isLoading: checkoutLoading } = useCheckout();
  
  const total = items.reduce((sum, item) => sum + (item.releases?.price || 0), 0);

  const handleRemoveItem = async (recordId: number) => {
    try {
      await removeFromCart(recordId);
    } catch (error) {
      console.error('[CART] Failed to remove item:', error);
    }
  };

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          {t('cart.title', 'Cart')}
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
            {t('cart.empty', 'Your cart is empty')}
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
                      variant={item.status === 'AVAILABLE' ? 'default' : 'secondary'}
                      className="mt-2"
                    >
                      {item.status}
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

          <div className="border-t pt-4 space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">
                {t('cart.total', 'Total')}
              </span>
              <span className="font-mono text-lg">
                {formatPrice(total)}
              </span>
            </div>
            
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ?
                t('cart.processing', 'Processing...') :
                t('cart.checkout', 'Checkout')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </SheetContent>
  );
}