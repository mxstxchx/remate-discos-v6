import { createClient } from '@/lib/supabase/client'

export const useSupabase = () => {
  return createClient()
}