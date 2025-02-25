"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/lib/auth/provider'
import { useAuthStore } from '@/lib/auth/hooks'
import { SimpleLanguageSelector } from './simple-language-selector'

export function BasicAuthModal() {
  const { t, i18n } = useTranslation('auth')
  const { signIn } = useAuthContext()
  const [alias, setAlias] = useState('')
  const [loading, setLoading] = useState(false)
  
  const error = useAuthStore(state => state.error)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const modalOpen = useAuthStore(state => state.modalOpen)
  const setModalOpen = useAuthStore(state => state.setModalOpen)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (alias.length < 6) return

    setLoading(true)
    try {
      await signIn(alias, i18n.language as 'es' | 'en')
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated && !modalOpen) return null
  if (!isAuthenticated && !modalOpen) setModalOpen(true) // Show modal if not authenticated

  if (!modalOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-background rounded-lg border border-primary/10 p-6 shadow-lg overflow-hidden">
        {/* Close button */}
        <button 
          className="absolute right-4 top-4 rounded-full w-6 h-6 flex items-center justify-center bg-secondary/80 opacity-70 transition-opacity hover:opacity-100"
          onClick={() => isAuthenticated && setModalOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-heading font-semibold text-center mb-1">{t('modal.title')}</h2>
          <p className="text-sm text-muted-foreground text-center">{t('modal.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Alias input */}
          <div className="space-y-2">
            <label htmlFor="alias" className="text-sm font-medium font-heading">{t('modal.aliasLabel')}</label>
            <Input
              id="alias"
              variant="inset"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={t('modal.aliasPlaceholder')}
              minLength={6}
              required
              disabled={loading}
            />
          </div>

          {/* Language selector */}
          <SimpleLanguageSelector />

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full font-heading"
            disabled={loading || alias.length < 6}
          >
            {loading ? t('modal.loading') : t('modal.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
