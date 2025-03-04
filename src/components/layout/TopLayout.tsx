import React from 'react'
import { ShoppingCart, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/auth/hooks'
import { useStore } from '@/store'
import { CartSheet } from './CartSheet'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from 'next-themes'
import Image from 'next/image'

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

  return (
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
          title={t('nav.switch_language')}
          className="rounded-full overflow-hidden flex items-center justify-center p-0"
        >
          {/* Show the flag of the language user would switch to */}
          {i18n.language === 'es' ? (
            // Show UK flag when in Spanish mode (to switch to English)
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="h-5 w-5">
              <clipPath id="a">
                <path d="M0 0v30h60V0z"/>
              </clipPath>
              <clipPath id="b">
                <path d="M30 15h30v15zv15H0zH0V0zV0h30z"/>
              </clipPath>
              <g clipPath="url(#a)">
                <path d="M0 0v30h60V0z" fill="#00247d"/>
                <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                <path d="M0 0l60 30m0-30L0 30" clipPath="url(#b)" stroke="#cf142b" strokeWidth="4"/>
                <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                <path d="M30 0v30M0 15h60" stroke="#cf142b" strokeWidth="6"/>
              </g>
            </svg>
          ) : (
            // Show Spanish flag when in English mode (to switch to Spanish)
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 500" className="h-5 w-5">
              <rect width="750" height="500" fill="#c60b1e"/>
              <rect width="750" height="250" fill="#ffc400" y="125"/>
            </svg>
          )}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="knurled" size="icon" title={t('nav.cart')} className="rounded-full">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <CartSheet />
        </Sheet>

        <Button
          variant="knurled"
          size="icon"
          onClick={() => setModalOpen(true)}
          title={t('nav.change_user')}
          className="rounded-full"
        >
          <UserCircle2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}