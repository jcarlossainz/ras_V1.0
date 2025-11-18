// 📁 app/api/vision/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeImage } from '@/lib/google-vision';

// Cliente Supabase con permisos de servicio
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({
        success: false,
        error: 'propertyId es requerido'
      }, { status: 400 });
    }

    console.log(`🔍 Iniciando análisis de propiedad: ${propertyId}`);

    // 1. Obtener la propiedad con sus espacios
    const { data: propertyData, error: propertyError } = await supabase
      .from('propiedades')
      .select('id, nombre_propiedad, espacios')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      console.error('❌ Error obteniendo propiedad:', propertyError);
      return NextResponse.json({
        success: false,
        error: `Error obteniendo propiedad: ${propertyError.message}`
      }, { status: 500 });
    }

    // 2. Crear mapa de espacios (ID → Nombre)
    const spacesMap = new Map<string, string>();

    if (propertyData.espacios && Array.isArray(propertyData.espacios)) {
      propertyData.espacios.forEach((espacio: any) => {
        const id = espacio.id || espacio.type;
        const name = espacio.name || espacio.type || 'Sin nombre';
        spacesMap.set(id, name);
      });
      console.log(`📍 Cargados ${spacesMap.size} espacios`);
    }

    // 3. Obtener todas las imágenes de la propiedad
    const { data: images, error: imagesError } = await supabase
      .from('property_images')
      .select('id, url, space_type')
      .eq('property_id', propertyId);

    if (imagesError) {
      console.error('❌ Error obteniendo imágenes:', imagesError);
      return NextResponse.json({
        success: false,
        error: `Error obteniendo imágenes: ${imagesError.message}`
      }, { status: 500 });
    }

    if (!images || images.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay imágenes para analizar'
      }, { status: 404 });
    }

    console.log(`📸 Encontradas ${images.length} imágenes para analizar`);

    // 4. Analizar cada imagen
    let totalObjectsDetected = 0;
    let imagesUpdated = 0;

    for (const image of images) {
      try {
        console.log(`🔍 Analizando imagen: ${image.id}`);

        // Analizar imagen con Google Vision
        const detectedObjects = await analyzeImage(image.url);

        if (detectedObjects.length === 0) {
          console.log(`⚠️ No se detectaron objetos en imagen ${image.id}`);
          continue;
        }

        console.log(`✅ Detectados ${detectedObjects.length} objetos en imagen ${image.id}`);

        // Tomar el objeto principal (el primero, con mayor score)
        const mainObject = detectedObjects[0];

        // Extraer todos los nombres para labels
        const labels = detectedObjects.map(obj => obj.name).join(', ');

        // Actualizar la imagen con los datos de IA
        const { error: updateError } = await supabase
          .from('property_images')
          .update({
            object_name: mainObject.name,
            labels: labels
          })
          .eq('id', image.id);

        if (updateError) {
          console.error(`❌ Error actualizando imagen ${image.id}:`, updateError);
          continue;
        }

        totalObjectsDetected += detectedObjects.length;
        imagesUpdated++;

        // Delay de 500ms para no saturar la API de Google
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`❌ Error analizando imagen ${image.id}:`, error);
        // Continuar con la siguiente imagen
      }
    }

    console.log(`📦 Total de objetos detectados: ${totalObjectsDetected}`);
    console.log(`🖼️ Imágenes actualizadas: ${imagesUpdated}`);

    if (imagesUpdated === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se detectaron objetos en ninguna imagen'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Se detectaron ${totalObjectsDetected} objetos en ${imagesUpdated} imágenes`,
      objectsDetected: totalObjectsDetected,
      imagesAnalyzed: images.length,
      imagesUpdated: imagesUpdated
    });

  } catch (error: any) {
    console.error('❌ Error en análisis de Vision:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido'
    }, { status: 500 });
  }
}
