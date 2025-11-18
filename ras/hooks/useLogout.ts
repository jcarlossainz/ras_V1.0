/**
 * useLogout Hook - Centralized Logout Logic
 * ==========================================
 *
 * Hook personalizado que maneja el cierre de sesión.
 * Reemplaza la lógica duplicada de handleLogout() en 8+ archivos.
 *
 * Características:
 * - ✅ Confirmación antes de cerrar sesión
 * - ✅ Manejo de errores robusto
 * - ✅ Feedback visual (toast)
 * - ✅ Redirect automático a /login
 * - ✅ Estado de loading
 *
 * Uso:
 * ```tsx
 * const { logout, isLoggingOut } = useLogout()
 *
 * <Button
 *   onClick={logout}
 *   loading={isLoggingOut}
 * >
 *   Cerrar Sesión
 * </Button>
 * ```
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import type { UseLogoutReturn } from '@/types/auth'

export function useLogout(): UseLogoutReturn {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  /**
   * Función principal de logout con confirmación
   */
  const logout = useCallback(async () => {
    try {
      // 1. Pedir confirmación al usuario
      const confirmed = await confirm.warning(
        '¿Estás seguro que deseas cerrar sesión?',
        'Se cerrará tu sesión actual'
      )

      if (!confirmed) {
        logger.debug('Logout cancelled by user')
        return
      }

      // 2. Iniciar proceso de logout
      setIsLoggingOut(true)
      logger.info('Starting logout process')

      // 3. Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      // 4. Mostrar mensaje de éxito
      toast.success('Sesión cerrada correctamente')
      logger.info('Logout successful')

      // 5. Redirigir a login
      router.push('/login')

    } catch (error) {
      // Manejo de errores
      logger.error('Logout failed:', error)
      toast.error('Error al cerrar sesión')
    } finally {
      setIsLoggingOut(false)
    }
  }, [router, toast, confirm])

  return {
    logout,
    isLoggingOut
  }
}

/**
 * Hook alternativo sin confirmación (para casos especiales)
 */
export function useLogoutWithoutConfirm(): UseLogoutReturn {
  const router = useRouter()
  const toast = useToast()

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback(async () => {
    try {
      setIsLoggingOut(true)

      const { error } = await supabase.auth.signOut()

      if (error) throw error

      toast.success('Sesión cerrada correctamente')
      router.push('/login')

    } catch (error) {
      logger.error('Logout failed:', error)
      toast.error('Error al cerrar sesión')
    } finally {
      setIsLoggingOut(false)
    }
  }, [router, toast])

  return {
    logout,
    isLoggingOut
  }
}
