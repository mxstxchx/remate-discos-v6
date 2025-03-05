export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

import { Session as SupabaseSession } from '@supabase/supabase-js';

export type Session = {
  id: string;
  user_alias: string;
  language: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  metadata: Json;
  is_admin?: boolean;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          alias: string
          is_admin: boolean
          created_at: string
        }
        Insert: {
          alias: string
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          alias?: string
          is_admin?: boolean
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_alias: string
          language: string
          created_at: string
          last_seen_at: string
          expires_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          user_alias: string
          language?: string
          created_at?: string
          last_seen_at?: string
          expires_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          user_alias?: string
          language?: string
          created_at?: string
          last_seen_at?: string
          expires_at?: string
          metadata?: Json
        }
      }
    }
  }
}