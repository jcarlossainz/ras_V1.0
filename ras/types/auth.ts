/**
 * AUTH TYPES - Authentication & User Types
 * ========================================
 *
 * Tipos TypeScript para autenticación y usuarios de RAS.
 * Reemplaza el uso de 'any' en todo el proyecto.
 */

import type { User as SupabaseUser } from '@supabase/supabase-js'

/**
 * Usuario autenticado de Supabase
 * Extendemos el tipo de Supabase User para agregar campos personalizados si es necesario
 */
export interface AuthUser extends SupabaseUser {
  id: string
  email: string
  created_at?: string
}

/**
 * Perfil de usuario desde la tabla 'profiles'
 */
export interface UserProfile {
  id: string
  nombre: string
  email: string
  empresa_id: string | null
  avatar_url?: string | null
  telefono?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Estado de autenticación combinado
 */
export interface AuthState {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  error: Error | null
}

/**
 * Return type del hook useAuth
 */
export interface UseAuthReturn {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  error: Error | null
  isAuthenticated: boolean
  refetch: () => Promise<void>
}

/**
 * Return type del hook useLogout
 */
export interface UseLogoutReturn {
  logout: () => Promise<void>
  isLoggingOut: boolean
}
