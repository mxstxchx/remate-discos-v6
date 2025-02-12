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
      // Check if user exists
      let { data: existingUser, error: userError } = await supabase
        .from('users')
        .select()
        .eq('alias', alias)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        throw userError
      }

      // Special case for admin alias
      const isAdmin = alias === '_soyelputoamo_'

      // Create user if doesn't exist
      if (!existingUser) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ alias, is_admin: isAdmin }])
          .select()
          .single()

        if (createError) throw createError
        existingUser = newUser
      }

      // Create new session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([{ user_alias: alias }])
        .select()
        .single()

      if (sessionError) throw sessionError

      setAuth({
        isAuthenticated: true,
        isAdmin: existingUser.is_admin,
        alias: existingUser.alias,
        error: null
      })

      return { 
        success: true, 
        session,
        isAdmin: existingUser.is_admin
      }
    } catch (error) {
      console.error('Auth error:', error)
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
        .eq('user_alias', useAuthStore.getState().alias)

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