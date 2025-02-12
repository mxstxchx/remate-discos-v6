"use client"

import { useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useAuthStore } from './use-auth-store'
import type { SignInResponse } from '../types'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const supabase = useSupabase()
  const { setAuth, reset } = useAuthStore()

  const signIn = useCallback(async (alias: string): Promise<SignInResponse> => {
    setLoading(true)
    try {
      // Create or update user
      const { data: user, error: userError } = await supabase
        .from('users')
        .upsert({ alias })
        .select()
        .single()

      if (userError) throw userError

      // Create new session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          id: crypto.randomUUID(),
          user_id: user.id,  // Using user.id instead of alias
          language: 'es',
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {}
        }])
        .select()
        .single()

      if (sessionError) throw sessionError

      setAuth({
        isAuthenticated: true,
        isAdmin: user.is_admin,
        alias: user.alias,
        error: null
      })

      return { 
        success: true, 
        session,
        isAdmin: user.is_admin
      }
    } catch (error) {
      const authError = {
        message: error.message || 'Failed to sign in',
        code: error.code
      }
      setAuth({ error: authError.message })
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [supabase, setAuth])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_id', useAuthStore.getState().alias)

      if (error) throw error
      reset()
      return { success: true }
    } catch (error) {
      setAuth({ error: error.message })
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [supabase, setAuth, reset])

  return {
    signIn,
    signOut,
    loading
  }
}