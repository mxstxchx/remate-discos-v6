import React from 'react'
import { ShoppingCart, UserCircle2, MessageCircle, Mail, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/auth/hooks'
import { useStore } from '@/store'
import { CartSheet } from './CartSheet'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import GB from 'country-flag-icons/react/3x2/GB'
import ES from 'country-flag-icons/react/3x2/ES'
import { CART_CONFIG } from '@/lib/constants'

export function TopLayout() {
  const { t, i18n } = useTranslation('common')
  const setModalOpen = useAuthStore(state => state.setModalOpen)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const setLanguage = useStore((state) => state.setLanguage)
  const { theme, resolvedTheme } = useTheme()
  
  // Use resolvedTheme which accounts for system preference
  const activeTheme = resolvedTheme || theme
  
  // Determine logo based on theme
  const logoSrc = activeTheme === 'dark' 
    ? '/images/logo_fina_new_white.png' 
    : '/images/logo_fina_new_black.png'
    
  // Re-render when theme changes
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  // Only update the logo once the component has mounted to avoid flash of incorrect logo
  const displayLogoSrc = !mounted ? '/images/logo_fina_new_white.png' : logoSrc

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(newLang)
    setLanguage(newLang as 'es' | 'en')
  }

  const handleWhatsAppContact = () => {
    const message = t('contact.default_message');
    window.open(`https://wa.me/${CART_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmailContact = () => {
    const subject = t('app.name');
    const body = t('contact.default_message');
    window.open(`mailto:${CART_CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <>
    <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-primary/10 bg-background px-4 texture-brushed-metal">
      <div className="h-9 sm:h-12 flex items-center transition-all duration-300">
        <Image 
          src={displayLogoSrc} 
          alt="Remate Discos"
          width={240} 
          height={48} 
          className="h-full w-auto transition-opacity duration-300" 
          priority
          onError={(e) => {
            // Fallback to text if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = '<div class="text-xl font-heading font-bold text-engraved">Remate Discos</div>';
          }}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        <Button
          variant="knurled"
          size="icon"
          onClick={toggleLanguage}
          title="Switch Language"
          className="rounded-full overflow-hidden flex items-center justify-center p-0"
        >
          {/* Show the flag of the language user would switch to */}
          {i18n.language === 'es' ? (
            // Show UK flag when in Spanish mode (to switch to English)
            <GB className="h-5 w-5" />
          ) : (
            // Show Spanish flag when in English mode (to switch to Spanish)
            <ES className="h-5 w-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="knurled" size="icon" title={t('contact.title')} className="rounded-full">
              <div className="relative h-5 w-5">
                <MessageCircle className="h-5 w-5" />
                <HelpCircle className="absolute h-3 w-3 -right-0.5 -bottom-0.5 bg-background text-foreground rounded-full" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('contact.title')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleWhatsAppContact}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {t('contact.whatsapp')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEmailContact}>
              <Mail className="mr-2 h-4 w-4" />
              {t('contact.email')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
    <div className="fixed bottom-0 left-0 right-0 z-40 text-center py-1 px-4 text-[8px] opacity-60 bg-background/50 backdrop-blur-sm">
      This application uses Discogs' API but is not affiliated with, sponsored or endorsed by Discogs. 'Discogs' is a trademark of Zink Media, LLC.
    </div>
    </>
  )
}