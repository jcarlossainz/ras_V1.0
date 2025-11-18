/**
 * useAuth Hook - Centralized Authentication Logic
 * ================================================
 *
 * Hook personalizado que maneja la autenticación del usuario.
 * Reemplaza la lógica duplicada de checkUser() en 10+ archivos.
 *
 * Características:
 * - ✅ Type-safe (no más 'any')
 * - ✅ Auto-redirect a /login si no está autenticado
 * - ✅ Carga automática del perfil del usuario
 * - ✅ Manejo de errores robusto
 * - ✅ Estado de loading
 * - ✅ Función refetch para recargar datos
 *
 * Uso:
 * ```tsx
 * const { user, profile, loading, isAuthenticated } = useAuth()
 *
 * if (loading) return <Loading />
 * if (!isAuthenticated) return null // Ya redirige automáticamente
 *
 * return <div>Hola {profile?.nombre}</div>
 * ```
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { AuthUser, UserProfile, UseAuthReturn } from '@/types/auth'

export function useAuth(): UseAuthReturn {
  const router = useRouter()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Función principal que verifica la autenticación
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Obtener usuario autenticado de Supabase
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      // 2. Si no hay usuario, redirigir a login
      if (!authUser) {
        logger.info('No authenticated user, redirecting to login')
        router.push('/login')
        return
      }

      // 3. Cargar perfil del usuario desde la tabla profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nombre, email, empresa_id, avatar_url, telefono, created_at, updated_at')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        logger.error('Error loading user profile:', profileError)
        // No lanzamos error aquí, profile puede ser null
      }

      // 4. Actualizar estado
      setUser(authUser as AuthUser)
      setProfile(profileData)

      logger.debug('Auth check successful', {
        userId: authUser.id,
        email: authUser.email,
        hasProfile: !!profileData
      })

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown auth error')
      logger.error('Auth check failed:', error)
      setError(error)

      // En caso de error, redirigir a login
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  /**
   * Función para recargar datos del usuario
   */
  const refetch = useCallback(async () => {
    await checkAuth()
  }, [checkAuth])

  /**
   * Efecto que ejecuta la verificación al montar el componente
   */
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  /**
   * Computed property: el usuario está autenticado
   */
  const isAuthenticated = !!user && !!profile

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    refetch
  }
}

/**
 * Hook alternativo más simple para páginas que solo necesitan verificar si hay usuario
 */
export function useRequireAuth(): { user: AuthUser; profile: UserProfile } | null {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (!user || !profile) return null

  return { user, profile }
}
