export interface AuthState {
  isAuthenticated: boolean
  isAdmin: boolean
  alias: string | null
  error: string | null
}

export interface AuthSession {
  id: string
  user_alias: string
  language: 'es' | 'en'
  created_at: string
  expires_at: string
  metadata: Record<string, unknown>
}

export type AuthError = {
  message: string
  code?: string
}

export type SignInResponse = {
  success: boolean
  session?: AuthSession
  isAdmin?: boolean
  error?: AuthError
}