import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useTranslation } from 'react-i18next'

export function CartSheet() {
 const { t } = useTranslation()

 return (
   <SheetContent>
     <SheetHeader>
       <SheetTitle>{t('cart.title', 'Shopping Cart')}</SheetTitle>
     </SheetHeader>
     {/* Cart items will be implemented in future tasks */}
     <div className="mt-4">
       <p className="text-muted-foreground">{t('cart.empty', 'Your cart is empty')}</p>
     </div>
   </SheetContent>
 )
}