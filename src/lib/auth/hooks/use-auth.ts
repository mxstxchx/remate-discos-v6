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

        const { data, error: createError } = await supabase
          .from('users')
          .insert({ alias, is_admin: isAdmin })
          .select('*')

        if (createError) {
          debug('user', 'Error creating user:', createError)
          throw createError
        }
        debug('user', 'User created:', data[0])
        existingUser = data[0]
      } else {
        debug('user', 'Found existing user:', existingUser)
      }

      // Create new session
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

  return {
    signIn,
    loading
  }
}