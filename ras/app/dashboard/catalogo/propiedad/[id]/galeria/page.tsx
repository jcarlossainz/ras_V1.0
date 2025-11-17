// 📁 src/app/dashboard/propiedad/[id]/galeria/page.tsx
// ✅ PLAN C APLICADO - Alerts y Confirms profesionales
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getPropertyImages } from '@/lib/supabase/supabase-storage';
import { supabase } from '@/lib/supabase/client';
import { compressImageDual } from '@/lib/supabase/image-compression';
import { uploadPropertyImageDual } from '@/lib/supabase/supabase-storage';
import TopBar from '@/components/ui/topbar';
import Loading from '@/components/ui/loading';
import EmptyState from '@/components/ui/emptystate';
import type { PropertyFormData, PropertyImage } from '@/types/property';

// ✅ PLAN C: Imports de notificaciones profesionales
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { logger } from '@/lib/logger';

export default function GaleriaPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  // ✅ PLAN C: Hooks de notificaciones
  const toast = useToast();
  const confirm = useConfirm();

  const [user, setUser] = useState<any>(null);
  const [property, setProperty] = useState<PropertyFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<PropertyImage[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');

  useEffect(() => {
    checkUser();
  }, [propertyId]);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { 
      router.push('/login'); 
      return; 
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    setUser({ ...profile, id: authUser.id });
    loadProperty();
  };

  const loadProperty = async () => {
    try {
      setLoading(true);
      
      // 1. Cargar propiedad desde tabla propiedades
      console.log('🔍 Cargando propiedad:', propertyId);
      const { data: propertyData, error: propertyError } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', propertyId)
        .single();

      // 2. Si no existe, mostrar error
      if (propertyError) {
        console.error('❌ Propiedad no encontrada:', propertyError);
        throw propertyError;
      }

      // 3. Cargar fotos
      console.log('📸 Cargando fotos...');
      const photosData = await getPropertyImages(propertyId);
      console.log(`✅ ${photosData.length} fotos encontradas`);

      // 4. Preparar espacios desde la BD
      let propertySpaces = [];
      
      if (propertyData?.espacios && Array.isArray(propertyData.espacios) && propertyData.espacios.length > 0) {
        // Mapear espacios reales del usuario
        propertySpaces = propertyData.espacios.map((espacio: any) => ({
          id: espacio.id || espacio.type,
          name: espacio.name,
          type: espacio.type,
          icon: getEspacioIcon(espacio.type)
        }));
        console.log('✅ Usando espacios reales del usuario:', propertySpaces.length);
      } else {
        // Espacios por defecto solo si no hay ninguno
        propertySpaces = [
          { id: 'sala', name: 'Sala', type: 'Sala', icon: '🛋️' },
          { id: 'cocina', name: 'Cocina', type: 'Cocina', icon: '🍳' },
          { id: 'recamara', name: 'Recámara', type: 'Habitación', icon: '🛏️' },
          { id: 'bano', name: 'Baño', type: 'Baño completo', icon: '🚿' },
        ];
        console.log('⚠️ Usando espacios por defecto');
      }
      
      // Agregar "Sin espacio" y "General" al inicio
      const espaciosConOpciones = [
        { id: 'all', name: 'Todos', type: 'all', icon: '📋' },
        { id: 'sin-espacio', name: 'Sin espacio', type: 'sin-espacio', icon: '📦' },
        { id: 'general', name: 'General', type: 'general', icon: '🏠' },
        ...propertySpaces
      ];

      // 5. Actualizar estado
      const propertyComplete: Partial<PropertyFormData> = {
        id: propertyId,
        nombre_propiedad: propertyData?.nombre || 'Mi Propiedad',
        tipo_propiedad: propertyData?.tipo_propiedad || 'Casa',
        estados: propertyData?.estados || ['Disponible'],
        photos: photosData,
        espacios: espaciosConOpciones,
      };

      setProperty(propertyComplete as PropertyFormData);
      setPhotos(photosData);
      console.log('✅ Propiedad cargada exitosamente con espacios:', espaciosConOpciones);

    } catch (error) {
      // ✅ PLAN C: Reemplazo de alert() por toast.error()
      logger.error('Error al cargar propiedad:', error);
      toast.error('Error al cargar la propiedad', {
        duration: 5000
      });
      router.push('/dashboard/catalogo');
    } finally {
      setLoading(false);
    }
  };

  // Función helper para obtener iconos según el tipo de espacio
  const getEspacioIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'Habitación': '🛏️',
      'Baño completo': '🚿',
      'Medio baño': '🚽',
      'Cocina': '🍳',
      'Sala': '🛋️',
      'Comedor': '🍽️',
      'Cuarto de lavado': '🧺',
      'Estacionamiento': '🚗',
      'Terraza': '🌿',
      'Jardín': '🌳',
      'Piscina': '🏊',
      'Gimnasio': '💪',
      'Oficina': '💼',
      'Estudio': '📚',
      'Bodega': '📦',
      'Garaje': '🚙',
    };
    return iconMap[type] || '📍';
  };

  // ✅ PLAN C: Logout con confirmación profesional
  const handleLogout = async () => {
    const confirmed = await confirm.default(
      '¿Cerrar sesión?',
      'Tendrás que volver a iniciar sesión'
    );
    
    if (confirmed) {
      await supabase.auth.signOut();
      toast.info('Sesión cerrada correctamente');
      router.push('/login');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newPhotos: PropertyImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          console.log(`📸 Procesando ${file.name}...`);
          
          // 1. Comprimir imagen
          const compressed = await compressImageDual(file);
          console.log(`✅ Comprimido: ${file.name}`);

          // 2. Subir a Supabase Storage
          const uploaded = await uploadPropertyImageDual(
            compressed.thumbnail,
            compressed.display,
            propertyId,
            file.name
          );
          console.log(`✅ Subido: ${file.name}`);

          // 3. Agregar a la lista
          newPhotos.push({
            id: uploaded.id,
            url: uploaded.urls.display,
            url_thumbnail: uploaded.urls.thumbnail,
            is_cover: photos.length === 0 && i === 0,
            caption: file.name,
            created_at: new Date().toISOString(),
            space_type: 'sin-espacio',
            property_id: propertyId,
          });

        } catch (fileError) {
          // ✅ PLAN C: Error individual por archivo con toast
          logger.error(`Error con archivo ${file.name}:`, fileError);
          toast.error(`Error al subir ${file.name}`, {
            duration: 4000
          });
        }
      }

      // ✅ PLAN C: Éxito con toast profesional
      if (newPhotos.length > 0) {
        setPhotos([...photos, ...newPhotos]);
        toast.success(`${newPhotos.length} foto(s) subida(s) exitosamente`, {
          duration: 3000
        });
      }

    } catch (error) {
      // ✅ PLAN C: Error general con toast
      logger.error('Error al subir fotos:', error);
      toast.error('Error al subir las fotos. Intenta nuevamente', {
        duration: 5000
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ PLAN C: Establecer portada con toast
  const handleSetCover = async (photoId: string) => {
    try {
      // Quitar portada de todas las fotos
      await supabase
        .from('property_images')
        .update({ is_cover: false })
        .eq('property_id', propertyId);

      // Establecer nueva portada
      await supabase
        .from('property_images')
        .update({ is_cover: true })
        .eq('id', photoId);

      // Actualizar estado local
      setPhotos(photos.map(photo => ({
        ...photo,
        is_cover: photo.id === photoId
      })));

      toast.success('Foto de portada actualizada', {
        duration: 3000
      });

    } catch (error) {
      logger.error('Error al establecer portada:', error);
      toast.error('Error al establecer la foto de portada', {
        duration: 4000
      });
    }
  };

  // ✅ PLAN C: Eliminar con confirmación profesional
  const handleDelete = async (photoId: string) => {
    const confirmed = await confirm.danger(
      '¿Eliminar esta foto?',
      'Esta acción no se puede deshacer'
    );
    
    if (!confirmed) return;

    try {
      await supabase
        .from('property_images')
        .delete()
        .eq('id', photoId);

      setPhotos(photos.filter(p => p.id !== photoId));
      
      toast.success('Foto eliminada correctamente', {
        duration: 3000
      });

    } catch (error) {
      logger.error('Error al eliminar foto:', error);
      toast.error('Error al eliminar la foto', {
        duration: 4000
      });
    }
  };

  // ✅ PLAN C: Asignar espacio con toast
  const handleAssignSpace = async (photoId: string, spaceType: string) => {
    try {
      await supabase
        .from('property_images')
        .update({ space_type: spaceType })
        .eq('id', photoId);

      setPhotos(photos.map(photo => 
        photo.id === photoId 
          ? { ...photo, space_type: spaceType }
          : photo
      ));

      const espacioNombre = property?.espacios?.find(e => e.id === spaceType)?.name || spaceType;
      
      toast.success(`Foto asignada a: ${espacioNombre}`, {
        duration: 3000
      });

    } catch (error) {
      logger.error('Error al asignar espacio:', error);
      toast.error('Error al asignar espacio', {
        duration: 4000
      });
    }
  };

  const handleStartEdit = (photo: PropertyImage) => {
    setEditingPhotoId(photo.id);
    setEditingCaption(photo.caption || '');
  };

  const handleCancelEdit = () => {
    setEditingPhotoId(null);
    setEditingCaption('');
  };

  // ✅ PLAN C: Guardar caption con validación y toast
  const handleSaveCaption = async (photoId: string) => {
    // Validación
    if (!editingCaption.trim()) {
      toast.warning('El nombre no puede estar vacío', {
        duration: 3000
      });
      return;
    }

    try {
      await supabase
        .from('property_images')
        .update({ caption: editingCaption.trim() })
        .eq('id', photoId);

      setPhotos(photos.map(photo =>
        photo.id === photoId
          ? { ...photo, caption: editingCaption.trim() }
          : photo
      ));

      setEditingPhotoId(null);
      setEditingCaption('');

      toast.success('Nombre actualizado correctamente', {
        duration: 3000
      });

    } catch (error) {
      logger.error('Error al actualizar nombre:', error);
      toast.error('Error al actualizar el nombre', {
        duration: 4000
      });
    }
  };

  // Filtrado de fotos
  const filteredPhotos = photos.filter(photo => {
    const matchesSpace = selectedSpace === 'all' || photo.space_type === selectedSpace;
    const matchesSearch = photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    return matchesSpace && (searchQuery === '' || matchesSearch);
  });

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title={`Galería - ${property?.nombre_propiedad || 'Propiedad'}`}
        showBackButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header con botón subir fotos */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 font-poppins">
                📸 Galería de Fotos
              </h2>
              <p className="text-gray-600 mt-1">
                {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </p>
            </div>

            {photos.length > 0 && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                <div className="px-6 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl font-semibold hover:shadow-xl transition-all hover:scale-105 active:scale-95">
                  {isUploading ? '⏳ Subiendo...' : '📸 Subir Fotos'}
                </div>
              </label>
            )}
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Buscador */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar fotos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-ras-turquesa focus:outline-none transition-colors"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
            </div>

            {/* Filtro por espacio */}
            <div className="relative">
              <select
                value={selectedSpace}
                onChange={(e) => setSelectedSpace(e.target.value)}
                className="appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:border-ras-turquesa focus:border-ras-turquesa focus:outline-none transition-colors cursor-pointer"
              >
                {property?.espacios?.map((espacio) => (
                  <option key={espacio.id} value={espacio.id}>
                    {espacio.name}
                  </option>
                ))}
              </select>
              <svg className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Grid de fotos */}
        {filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all">
                {/* Imagen con dropdown y badge */}
                <div className="relative aspect-square">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Foto'}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Badge de portada */}
                  {photo.is_cover && (
                    <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
                      ⭐ PORTADA
                    </div>
                  )}

                  {/* Dropdown de espacios dentro de la imagen */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <select
                      value={photo.space_type || 'sin-espacio'}
                      onChange={(e) => handleAssignSpace(photo.id, e.target.value)}
                      className="w-full px-3 py-2 bg-white/95 backdrop-blur-sm border-2 border-white/50 rounded-lg text-sm font-medium focus:border-ras-turquesa focus:outline-none transition-colors cursor-pointer"
                    >
                      {property?.espacios?.map((espacio) => (
                        <option key={espacio.id} value={espacio.id}>
                          {espacio.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nombre de la foto (editable) */}
                <div className="p-4">
                  {editingPhotoId === photo.id ? (
                    <div className="mb-3">
                      <input
                        type="text"
                        value={editingCaption}
                        onChange={(e) => setEditingCaption(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-ras-turquesa rounded-lg text-sm font-medium focus:outline-none mb-2"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleSaveCaption(photo.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveCaption(photo.id)}
                          className="flex-1 px-3 py-1 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 mb-3 font-medium truncate">
                      {photo.caption}
                    </p>
                  )}

                  {/* 3 Botones de acción */}
                  {editingPhotoId !== photo.id && (
                    <div className="flex gap-2 justify-center">
                      {/* Botón Portada (solo si no es portada) */}
                      {!photo.is_cover && (
                        <button
                          onClick={() => handleSetCover(photo.id)}
                          className="w-10 h-10 rounded-lg border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-400 hover:scale-110 transition-all flex items-center justify-center group"
                          title="Establecer como portada"
                        >
                          <svg className="w-5 h-5 text-yellow-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        </button>
                      )}

                      {/* Botón Editar */}
                      <button
                        onClick={() => handleStartEdit(photo)}
                        className="w-10 h-10 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 hover:scale-110 transition-all flex items-center justify-center group"
                        title="Editar nombre"
                      >
                        <svg className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="w-10 h-10 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 hover:scale-110 transition-all flex items-center justify-center group"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={
              <svg className="w-12 h-12 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            }
            title={photos.length === 0 ? "No hay fotos en la galería" : "No se encontraron resultados"}
            description={photos.length === 0 ? "Sube la primera foto de tu propiedad" : "Intenta con otra búsqueda o cambia los filtros"}
            actionLabel={photos.length === 0 ? "📸 Subir Fotos" : undefined}
            onAction={photos.length === 0 ? () => document.querySelector('input[type="file"]')?.click() : undefined}
          />
        )}

        {/* Input oculto para cuando no hay fotos */}
        {photos.length === 0 && (
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
        )}
      </main>
    </div>
  );
}