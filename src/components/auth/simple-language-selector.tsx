"use client"

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function SimpleLanguageSelector() {
  const { i18n, t } = useTranslation('auth')

  const setLanguage = (lang: 'es' | 'en') => {
    i18n.changeLanguage(lang)
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t('modal.languageLabel')}</div>
      <div className="flex gap-4">
        <Button 
          type="button"
          variant={i18n.language === 'es' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setLanguage('es')}
          className="flex-1"
        >
          Español
        </Button>
        <Button 
          type="button"
          variant={i18n.language === 'en' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setLanguage('en')}
          className="flex-1"
        >
          English
        </Button>
      </div>
    </div>
  )
}
