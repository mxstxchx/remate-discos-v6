import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type Database } from './types'

// Create a reliable client with robust error handling
export const createClient = () => {
  // Server-side rendering check
  const isServer = typeof window === 'undefined';
  
  // For server-side rendering, create a basic client without WebSocket patching
  if (isServer) {
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: (...args) => {
            return fetch(...args).catch(err => {
              console.warn('Supabase fetch error handled:', err);
              throw err;
            });
          }
        }
      }
    );
  }
  
  // Client-side with WebSocket handling
  // Custom WebSocket class to prevent errors in console
  class SilentWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      
      // Override onerror to prevent uncaught exceptions
      this.onerror = (event) => {
        // Silently handle WebSocket errors
        console.debug('WebSocket connection issue handled silently');
      };
    }
  }

  // Patch global WebSocket to use our silent version
  const originalWebSocket = window.WebSocket;
  try {
    // @ts-ignore - Temporarily override WebSocket
    window.WebSocket = SilentWebSocket;

    // Create the Supabase client with customized settings
    const client = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: {
          params: {
            eventsPerSecond: 10
          },
          headers: {
            'X-Client-Info': 'next-js'
          }
        },
        global: {
          fetch: (...args) => {
            return fetch(...args).catch(err => {
              console.warn('Supabase fetch error handled:', err);
              throw err;
            });
          }
        }
      }
    );

    return client;
  } finally {
    // Restore original WebSocket after client creation
    // @ts-ignore - Restore original WebSocket
    window.WebSocket = originalWebSocket;
  }
}

// Create the singleton client instance
export const supabase = createClient()