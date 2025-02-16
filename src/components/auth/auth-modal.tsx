"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/lib/auth/provider'
import { useAuthStore } from '@/lib/auth/hooks'
import { LanguageSelector } from './language-selector'

export function AuthModal() {
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

 return (
   <Dialog
     open={modalOpen}
     onOpenChange={(open) => {
       if (!open && isAuthenticated) {
         setModalOpen(false)
       }
     }}
   >
     <DialogContent className="sm:max-w-md">
       <DialogHeader>
         <DialogTitle>{t('modal.title')}</DialogTitle>
         <DialogDescription>{t('modal.subtitle')}</DialogDescription>
       </DialogHeader>

       <form onSubmit={handleSubmit} className="space-y-4">
         <div className="space-y-2">
           <Label htmlFor="alias">{t('modal.aliasLabel')}</Label>
           <Input
             id="alias"
             value={alias}
             onChange={(e) => setAlias(e.target.value)}
             placeholder={t('modal.aliasPlaceholder')}
             minLength={6}
             required
             disabled={loading}
           />
         </div>

         <LanguageSelector />

         {error && (
           <div className="flex items-center gap-2 text-sm text-destructive">
             <AlertCircle className="h-4 w-4" />
             <span>{authState.error}</span>
           </div>
         )}

         <Button
           type="submit"
           className="w-full"
           disabled={loading || alias.length < 6}
         >
           {loading ? t('modal.loading') : t('modal.submit')}
         </Button>
       </form>
     </DialogContent>
   </Dialog>
 )
}