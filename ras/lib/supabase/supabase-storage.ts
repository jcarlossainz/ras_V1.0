// 📁 src/lib/supabase-storage.ts
import { supabase } from '@/lib/supabase/client';

/**
 * 📸 SUBIR IMAGEN DUAL (Thumbnail + Display)
 * Sube ambas versiones de la imagen a Supabase Storage y guarda metadata en BD
 */
export async function uploadPropertyImageDual(
  thumbnailBlob: Blob,
  displayBlob: Blob,
  propertyId: string,
  originalFileName: string
) {
  try {
    // 1. Generar ID único para esta imagen
    const imageId = crypto.randomUUID();
    const timestamp = Date.now();
    const ext = 'jpg'; // Siempre usamos JPG después de compresión

    // 2. Rutas en Storage
    const thumbPath = `propiedades/${propertyId}/thumbnails/${imageId}_thumb_${timestamp}.${ext}`;
    const displayPath = `propiedades/${propertyId}/display/${imageId}_display_${timestamp}.${ext}`;

    // 3. Subir THUMBNAIL
    const { error: thumbError } = await supabase.storage
      .from('property-images')
      .upload(thumbPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (thumbError) throw new Error(`Error subiendo thumbnail: ${thumbError.message}`);

    // 4. Subir DISPLAY
    const { error: displayError } = await supabase.storage
      .from('property-images')
      .upload(displayPath, displayBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (displayError) {
      // Si falla display, eliminar thumbnail
      await supabase.storage.from('property-images').remove([thumbPath]);
      throw new Error(`Error subiendo display: ${displayError.message}`);
    }

    // 5. Obtener URLs públicas
    const { data: thumbUrl } = supabase.storage
      .from('property-images')
      .getPublicUrl(thumbPath);

    const { data: displayUrl } = supabase.storage
      .from('property-images')
      .getPublicUrl(displayPath);

    // 6. Obtener dimensiones del display blob
    const dimensions = await getImageDimensions(displayBlob);

    // 7. Guardar metadata en la tabla property_images
    const { data: imageRecord, error: dbError } = await supabase
      .from('property_images')
      .insert({
        id: imageId,
        property_id: propertyId,
        url: displayUrl.publicUrl,
        url_thumbnail: thumbUrl.publicUrl,
        file_size: {
          thumbnail: thumbnailBlob.size,
          display: displayBlob.size
        },
        dimensions: {
          thumbnail: { width: 300, height: 300 },
          display: { width: dimensions.width, height: dimensions.height }
        },
        is_cover: false,
        order_index: 0,
        space_type: null,
        caption: originalFileName
      })
      .select()
      .single();

    if (dbError) {
      // Si falla BD, eliminar archivos subidos
      await supabase.storage.from('property-images').remove([thumbPath, displayPath]);
      throw new Error(`Error guardando en BD: ${dbError.message}`);
    }

    return {
      id: imageId,
      urls: {
        thumbnail: thumbUrl.publicUrl,
        display: displayUrl.publicUrl
      },
      paths: {
        thumbnail: thumbPath,
        display: displayPath
      },
      metadata: {
        uploadedAt: new Date().toISOString(),
        fileSize: displayBlob.size,
        dimensions
      }
    };

  } catch (error) {
    console.error('❌ Error en uploadPropertyImageDual:', error);
    throw error;
  }
}

/**
 * 🗑️ ELIMINAR IMAGEN
 * Elimina archivos de Storage y registro de BD
 */
export async function deletePropertyImage(imageId: string, propertyId: string) {
  try {
    // 1. Obtener URLs antes de eliminar
    const { data: imageData, error: fetchError } = await supabase
      .from('property_images')
      .select('url, url_thumbnail')
      .eq('id', imageId)
      .eq('property_id', propertyId)
      .single();

    if (fetchError) throw new Error(`Error obteniendo imagen: ${fetchError.message}`);
    if (!imageData) throw new Error('Imagen no encontrada');

    // 2. Extraer rutas de storage desde las URLs
    // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const extractPath = (url: string) => {
      const parts = url.split('/property-images/');
      return parts.length > 1 ? parts[1] : null;
    };

    const displayPath = extractPath(imageData.url);
    const thumbnailPath = imageData.url_thumbnail ? extractPath(imageData.url_thumbnail) : null;

    // 3. Eliminar archivos de Storage
    const pathsToDelete = [displayPath, thumbnailPath].filter(Boolean) as string[];
    if (pathsToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('property-images')
        .remove(pathsToDelete);

      if (storageError) console.warn('⚠️ Error eliminando de Storage:', storageError);
    }

    // 4. Eliminar registro de BD
    const { error: dbError } = await supabase
      .from('property_images')
      .delete()
      .eq('id', imageId)
      .eq('property_id', propertyId);

    if (dbError) throw new Error(`Error eliminando de BD: ${dbError.message}`);

    return { success: true };

  } catch (error) {
    console.error('❌ Error en deletePropertyImage:', error);
    throw error;
  }
}

/**
 * 📋 OBTENER IMÁGENES DE UNA PROPIEDAD
 */
export async function getPropertyImages(propertyId: string) {
  try {
    const { data, error } = await supabase
      .from('property_images')
      .select('*')
      .eq('property_id', propertyId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('❌ Error obteniendo imágenes:', error);
    throw error;
  }
}

/**
 * ⭐ ACTUALIZAR PORTADA
 */
export async function updateCoverImage(propertyId: string, newCoverId: string) {
  try {
    // 1. Quitar portada de todas las imágenes
    await supabase
      .from('property_images')
      .update({ is_cover: false })
      .eq('property_id', propertyId);

    // 2. Establecer nueva portada
    const { error } = await supabase
      .from('property_images')
      .update({ is_cover: true })
      .eq('id', newCoverId)
      .eq('property_id', propertyId);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error('❌ Error actualizando portada:', error);
    throw error;
  }
}

/**
 * 🏠 ACTUALIZAR ESPACIO DE IMAGEN
 */
export async function updateImageSpace(imageId: string, spaceType: string | null) {
  try {
    const { error } = await supabase
      .from('property_images')
      .update({ space_type: spaceType })
      .eq('id', imageId);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error('❌ Error actualizando espacio:', error);
    throw error;
  }
}

/**
 * 📝 ACTUALIZAR CAPTION
 */
export async function updateImageCaption(imageId: string, caption: string | null) {
  try {
    const { error } = await supabase
      .from('property_images')
      .update({ caption })
      .eq('id', imageId);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error('❌ Error actualizando caption:', error);
    throw error;
  }
}

/**
 * 🔢 ACTUALIZAR ORDEN DE IMÁGENES
 */
export async function updateImagesOrder(updates: { id: string; order_index: number }[]) {
  try {
    const promises = updates.map(({ id, order_index }) =>
      supabase
        .from('property_images')
        .update({ order_index })
        .eq('id', id)
    );

    await Promise.all(promises);
    return { success: true };

  } catch (error) {
    console.error('❌ Error actualizando orden:', error);
    throw error;
  }
}

/**
 * 🔧 HELPER: Obtener dimensiones de una imagen
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error cargando imagen para obtener dimensiones'));
    };

    img.src = url;
  });
}