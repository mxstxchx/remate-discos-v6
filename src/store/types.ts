import type { Json } from '@/lib/supabase/types'

export interface Session {
  id: string
  user_alias: string
  language: 'es' | 'en'
  created_at: string
  last_seen_at: string
  expires_at: string
  metadata: Json
}

export interface User {
  alias: string
  is_admin: boolean
  created_at: string
}