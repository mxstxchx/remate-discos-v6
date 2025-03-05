import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type Database } from './types'

// Create a client with better connection handling
export const createClient = () => {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        // Add connection handling to prevent console errors during page transitions
        headers: {
          'X-Client-Info': 'next-js'
        }
      },
      // Add global error handler
      global: {
        fetch: (...args) => {
          return fetch(...args).catch(err => {
            console.warn('Supabase fetch error:', err);
            throw err;
          });
        }
      }
    }
  )
}

export const supabase = createClient()