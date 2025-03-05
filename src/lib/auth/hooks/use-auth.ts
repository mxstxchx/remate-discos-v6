"use client"

import { useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { useAuthStore } from './use-auth-store'
import { AuthState } from '../types'
import type { SignInResponse } from '../types'

const debug = (area: string, message: string, data?: any) => {
  console.log(`[Auth:${area}]`, message, data ? data : '')
}

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const supabase = useSupabase()
  const store = useAuthStore()
  const setAuth = (authState: Partial<AuthState>) => store.setAuth(authState)
  const reset = () => store.reset()

  const signIn = useCallback(async (alias: string, language: 'es' | 'en' = 'es'): Promise<SignInResponse> => {
    setLoading(true)
    debug('signIn', `Starting sign in for alias: ${alias}`)

    try {
      // Check/create user
      debug('user', 'Checking for existing user')
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('alias', alias)

      if (userError) {
        debug('user', 'Error checking user:', userError)
        throw userError
      }

      let existingUser = users?.[0]

      if (!existingUser) {
        debug('user', 'Creating new user')
        const isAdmin = alias === '_soyelputoamo_'
        debug('user', `Admin status: ${isAdmin}`)

        const { error: createError } = await supabase
          .from('users')
          .insert({ alias, is_admin: isAdmin })

        if (createError) {
          debug('user', 'Error creating user:', createError)
          throw createError
        }

        const { data: newUser } = await supabase
          .from('users')
          .select('*')
          .eq('alias', alias)
          .single()

        debug('user', 'User created:', newUser)
        existingUser = newUser
      } else {
        debug('user', 'Found existing user:', existingUser)
      }

      // Create new session
      debug('sessions', 'Creating new session')
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({ user_alias: alias, language })
        .select()
        .single()

      if (sessionError) {
        debug('sessions', 'Error creating session:', sessionError)
        throw sessionError
      }

      debug('sessions', 'Session created:', session)
      debug('auth', 'Setting auth state')

      setAuth({
        isAuthenticated: true,
        isAdmin: existingUser.is_admin,
        alias: existingUser.alias,
        session,
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
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown',
        details: error && typeof error === 'object' && 'details' in error ? error.details : {}
      })

      const authError = {
        message: error instanceof Error ? error.message : 'Failed to sign in',
        code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown'
      }
      setAuth({ error: authError.message })
      return { success: false, error: { message: authError.message, code: authError.code as string } }
    } finally {
      setLoading(false)
    }
  }, [supabase, setAuth])

  const signOut = useCallback(async () => {
    // Create a local accessor function for useAuthStore state
    // Get current session from store
    const { session } = useAuthStore.getState()
    
    if (!session?.id) return
    
    try {
      await supabase
        .from('sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', session.id)
      
      reset()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }, [supabase, reset])

  return {
    signIn,
    signOut,
    loading
  }
}