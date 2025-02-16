import { Globe, ShoppingCart, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/auth/hooks'
import { useStore } from '@/store'
import { CartSheet } from './CartSheet'

export function TopLayout() {
  const { i18n } = useTranslation()
  const setModalOpen = useAuthStore(state => state.setModalOpen)
  const setLanguage = useStore((state) => state.setLanguage)

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(newLang)
    setLanguage(newLang as 'es' | 'en')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4">
      <div className="text-xl font-bold">Remate Discos</div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLanguage}
          title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
        >
          <Globe className="h-5 w-5" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" title="Cart">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <CartSheet />
        </Sheet>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setModalOpen(true)}
          title="Change User"
        >
          <UserCircle2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}