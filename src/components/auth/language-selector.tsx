"use client"

import { useTranslation } from 'react-i18next'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export function LanguageSelector() {
  const { i18n, t } = useTranslation('auth')

  return (
    <div className="space-y-2">
      <Label>{t('modal.languageLabel')}</Label>
      <RadioGroup
        defaultValue={i18n.language}
        onValueChange={(value) => i18n.changeLanguage(value)}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="es" id="es" />
          <Label htmlFor="es">Español</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="en" id="en" />
          <Label htmlFor="en">English</Label>
        </div>
      </RadioGroup>
    </div>
  )
}