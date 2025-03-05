import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type Database } from './types'

export const createClient = () => {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Disable realtime to avoid WebSocket connection errors
      realtime: {
        enabled: false
      }
    }
  )
}

export const supabase = createClient()