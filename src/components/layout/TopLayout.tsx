import { Globe, ShoppingCart, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/auth/hooks'
import { useStore } from '@/store'
import { CartSheet } from './CartSheet'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function TopLayout() {
  const { i18n } = useTranslation()
  const setModalOpen = useAuthStore(state => state.setModalOpen)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const setLanguage = useStore((state) => state.setLanguage)

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(newLang)
    setLanguage(newLang as 'es' | 'en')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-primary/10 bg-background px-4 texture-brushed-metal">
      <div className="text-xl font-heading font-bold text-engraved">Remate Discos</div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        <Button
          variant="knurled"
          size="icon"
          onClick={toggleLanguage}
          title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          className="rounded-full"
        >
          <Globe className="h-5 w-5" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="knurled" size="icon" title="Cart" className="rounded-full">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <CartSheet />
        </Sheet>

        <Button
          variant="knurled"
          size="icon"
          onClick={() => setModalOpen(true)}
          title="Change User"
          className="rounded-full"
        >
          <UserCircle2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}