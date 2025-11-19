/**
 * Hook para gestionar operaciones de base de datos de propiedades
 * Maneja CRUD de propiedades en Supabase
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export interface PropertyData {
  [key: string]: any
}

export interface UsePropertyDatabaseReturn {
  createProperty: (data: PropertyData) => Promise<{ id: string; error: any }>
  updateProperty: (id: string, data: PropertyData) => Promise<{ error: any }>
  deleteProperty: (id: string) => Promise<{ error: any }>
  getProperty: (id: string) => Promise<{ data: any; error: any }>
  uploadPropertyImage: (propertyId: string, file: File) => Promise<{ url: string; error: any }>
}

export function usePropertyDatabase(): UsePropertyDatabaseReturn {

  /**
   * Crear una nueva propiedad
   */
  const createProperty = async (data: PropertyData) => {
    try {
      logger.log('📝 Creando propiedad:', data)

      const { data: property, error } = await supabase
        .from('propiedades')
        .insert(data)
        .select()
        .single()

      if (error) {
        logger.error('❌ Error creando propiedad:', error)
        return { id: '', error }
      }

      logger.log('✅ Propiedad creada exitosamente:', property)
      return { id: property.id, error: null }
    } catch (error) {
      logger.error('❌ Error inesperado creando propiedad:', error)
      return { id: '', error }
    }
  }

  /**
   * Actualizar una propiedad existente
   */
  const updateProperty = async (id: string, data: PropertyData) => {
    try {
      logger.log('📝 Actualizando propiedad:', id, data)

      const { error } = await supabase
        .from('propiedades')
        .update(data)
        .eq('id', id)

      if (error) {
        logger.error('❌ Error actualizando propiedad:', error)
        return { error }
      }

      logger.log('✅ Propiedad actualizada exitosamente')
      return { error: null }
    } catch (error) {
      logger.error('❌ Error inesperado actualizando propiedad:', error)
      return { error }
    }
  }

  /**
   * Eliminar una propiedad
   */
  const deleteProperty = async (id: string) => {
    try {
      logger.log('🗑️ Eliminando propiedad:', id)

      const { error } = await supabase
        .from('propiedades')
        .delete()
        .eq('id', id)

      if (error) {
        logger.error('❌ Error eliminando propiedad:', error)
        return { error }
      }

      logger.log('✅ Propiedad eliminada exitosamente')
      return { error: null }
    } catch (error) {
      logger.error('❌ Error inesperado eliminando propiedad:', error)
      return { error }
    }
  }

  /**
   * Obtener una propiedad por ID
   */
  const getProperty = async (id: string) => {
    try {
      logger.log('🔍 Obteniendo propiedad:', id)

      const { data, error } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        logger.error('❌ Error obteniendo propiedad:', error)
        return { data: null, error }
      }

      logger.log('✅ Propiedad obtenida exitosamente')
      return { data, error: null }
    } catch (error) {
      logger.error('❌ Error inesperado obteniendo propiedad:', error)
      return { data: null, error }
    }
  }

  /**
   * Subir imagen de propiedad a Supabase Storage
   */
  const uploadPropertyImage = async (propertyId: string, file: File) => {
    try {
      logger.log('📤 Subiendo imagen para propiedad:', propertyId)

      const fileExt = file.name.split('.').pop()
      const fileName = `${propertyId}/${Date.now()}.${fileExt}`
      const filePath = `property-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('properties')
        .upload(filePath, file)

      if (uploadError) {
        logger.error('❌ Error subiendo imagen:', uploadError)
        return { url: '', error: uploadError }
      }

      const { data: publicUrlData } = supabase.storage
        .from('properties')
        .getPublicUrl(filePath)

      logger.log('✅ Imagen subida exitosamente:', publicUrlData.publicUrl)
      return { url: publicUrlData.publicUrl, error: null }
    } catch (error) {
      logger.error('❌ Error inesperado subiendo imagen:', error)
      return { url: '', error }
    }
  }

  return {
    createProperty,
    updateProperty,
    deleteProperty,
    getProperty,
    uploadPropertyImage
  }
}
