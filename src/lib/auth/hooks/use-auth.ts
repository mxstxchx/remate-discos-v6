"use client"

import { useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useAuthStore } from './use-auth-store'
import type { SignInResponse } from '../types'

const debug = (area: string, message: string, data?: any) => {
  console.log(`[Auth:${area}]`, message, data ? data : '')
}

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const supabase = useSupabase()
  const { setAuth, reset } = useAuthStore()

  const signIn = useCallback(async (alias: string): Promise<SignInResponse> => {
    setLoading(true)
    debug('signIn', `Starting sign in for alias: ${alias}`)

    try {
      // First expire any existing sessions
      debug('sessions', 'Expiring existing sessions')
      const { error: expireError } = await supabase
        .from('sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_alias', alias)

      if (expireError) {
        debug('sessions', 'Error expiring sessions:', expireError)
      }

      // Check/create user
      debug('user', 'Checking for existing user')
      let { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('alias', alias)
        .single()

      if (userError) {
        debug('user', 'Error checking user:', userError)
        if (userError.code !== 'PGRST116') {
          throw userError
        }
      }

      if (!existingUser) {
        debug('user', 'Creating new user')
        const isAdmin = alias === '_soyelputoamo_'
        debug('user', `Admin status: ${isAdmin}`)

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ alias, is_admin: isAdmin })
          .select('*')
          .single()

        if (createError) {
          debug('user', 'Error creating user:', createError)
          throw createError
        }
        debug('user', 'User created:', newUser)
        existingUser = newUser
      } else {
        debug('user', 'Found existing user:', existingUser)
      }

      // Create session
      debug('sessions', 'Creating new session')
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({ user_alias: alias })
        .select()
        .single()

      if (sessionError) {
        debug('sessions', 'Error creating session:', sessionError)
        throw sessionError
      }
      debug('sessions', 'Session created:', session)

      setAuth({
        isAuthenticated: true,
        isAdmin: existingUser.is_admin,
        alias: existingUser.alias,
        error: null
      })

      debug('auth', 'Sign in complete')
      return { 
        success: true, 
        session,
        isAdmin: existingUser.is_admin
      }
    } catch (error) {
      debug('error', 'Sign in failed:', {
        message: error.message,
        code: error.code,
        details: error.details
      })

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
    const alias = useAuthStore.getState().alias
    debug('signOut', `Starting sign out for alias: ${alias}`)
    
    if (!alias) {
      debug('signOut', 'No active session found')
      return { success: true }
    }

    setLoading(true)
    try {
      debug('sessions', 'Expiring session')
      const { error } = await supabase
        .from('sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_alias', alias)

      if (error) {
        debug('sessions', 'Error expiring session:', error)
        throw error
      }

      debug('auth', 'Resetting auth state')
      reset()
      debug('signOut', 'Sign out complete')
      return { success: true }
    } catch (error) {
      debug('error', 'Sign out failed:', error)
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