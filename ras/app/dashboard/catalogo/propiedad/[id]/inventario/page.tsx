'use client'

/**
 * INVENTARIO - Vista Individual con IA
 * Gestión de inventario con detección automática de objetos usando Vision API
 */

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/components/ui/confirm-modal'
import { logger } from '@/lib/logger'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'

interface InventoryItem {
  id: string
  object_name: string | null
  space_type: string | null
  labels: string | null
  url: string
  uploaded_at: string
}

interface PropertyData {
  id: string
  nombre_propiedad: string
  tipo_propiedad: string
  espacios: any[]
}

interface SpaceOption {
  id: string
  name: string
}

export default function InventarioPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  const [property, setProperty] = useState<PropertyData | null>(null)
  const [spaces, setSpaces] = useState<SpaceOption[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSpace, setFilterSpace] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData()
    }
  }, [authLoading, isAuthenticated, propertyId])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Cargar propiedad con sus espacios
      const { data: propertyData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, espacios')
        .eq('id', propertyId)
        .single()

      if (propError) {
        console.error('Error cargando propiedad:', propError)
        toast.error('No se pudo cargar la propiedad')
        router.push('/dashboard/catalogo')
        return
      }

      setProperty(propertyData)

      // Extraer espacios del JSONB
      if (propertyData.espacios && Array.isArray(propertyData.espacios)) {
        const espaciosOptions: SpaceOption[] = propertyData.espacios.map((espacio: any) => ({
          id: espacio.id || espacio.type,
          name: espacio.name || espacio.type
        }))
        setSpaces(espaciosOptions)
      }

      // Cargar inventario (imágenes con detección de IA)
      await loadInventory()

    } catch (error: any) {
      logger.error('Error cargando datos:', error)
      toast.error('Error al cargar la propiedad')
    } finally {
      setLoading(false)
    }
  }, [propertyId, toast, router])

  const loadInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('property_images')
        .select('id, object_name, space_type, labels, url, uploaded_at')
        .eq('property_id', propertyId)
        .not('object_name', 'is', null) // Solo imágenes que ya fueron analizadas
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setInventory(data || [])
    } catch (error: any) {
      logger.error('Error cargando inventario:', error)
    }
  }, [propertyId])

  const handleAnalyzeAll = useCallback(async () => {
    const confirmed = await confirm.warning(
      '¿Analizar todas las fotos de la galería?',
      'Este proceso puede tomar varios minutos dependiendo de la cantidad de imágenes.'
    )

    if (!confirmed) return

    try {
      setAnalyzing(true)

      const response = await fetch('/api/vision/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        await loadInventory()
      } else {
        throw new Error(result.error)
      }

    } catch (error: any) {
      logger.error('Error en análisis:', error)
      toast.error('Error al analizar las imágenes')
    } finally {
      setAnalyzing(false)
    }
  }, [propertyId, loadInventory, toast, confirm])

  const handleClearDetection = useCallback(async (imageId: string) => {
    const confirmed = await confirm.warning(
      '¿Limpiar detección de IA?',
      'Esto eliminará la información detectada automáticamente. Podrás volver a analizar la imagen más tarde.'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('property_images')
        .update({
          object_name: null,
          labels: null
        })
        .eq('id', imageId)

      if (error) throw error

      setInventory(inventory.filter(item => item.id !== imageId))
      toast.success('Detección eliminada correctamente')
    } catch (error: any) {
      logger.error('Error eliminando detección:', error)
      toast.error('Error al eliminar la detección')
    }
  }, [inventory, toast, confirm])

  const volverCatalogo = useCallback(() => {
    router.push('/dashboard/catalogo')
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  // Función para obtener el nombre real del espacio
  const getSpaceName = useCallback((spaceId: string | null): string => {
    if (!spaceId) return 'Sin espacio'

    const space = spaces.find(s => s.id === spaceId)
    return space ? space.name : spaceId
  }, [spaces])

  // Filtrar inventario
  const filteredInventory = inventory.filter((item) => {
    // Filtro de búsqueda
    const matchesSearch =
      (item.object_name && item.object_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.labels && item.labels.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filtro por espacio
    const matchesSpace =
      filterSpace === 'all' ||
      (filterSpace === 'sin-espacio' && !item.space_type) ||
      item.space_type === filterSpace

    return matchesSearch && matchesSpace
  })

  // Obtener espacios únicos del inventario
  const uniqueSpaces = Array.from(new Set(
    inventory
      .filter(item => item.space_type)
      .map(item => item.space_type as string)
  ))

  if (loading || authLoading) {
    return <Loading message="Cargando inventario..." />
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon={
            <svg className="w-12 h-12 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          }
          title="Propiedad no encontrada"
          description="No se pudo cargar la información de la propiedad"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title={`Inventario - ${property.nombre_propiedad}`}
        showBackButton
        onBackClick={volverCatalogo}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Barra de acción superior */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Botón Analizar */}
            <div>
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzing}
                className="px-6 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl hover:shadow-lg transition-all disabled:bg-gray-400 font-semibold"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Analizando...
                  </span>
                ) : (
                  '🔍 Analizar Galería con IA'
                )}
              </button>
              <p className="text-sm text-gray-500 mt-2">Detecta objetos automáticamente en todas las fotos</p>
            </div>

            {/* Total de Items */}
            <div className="text-right">
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Total de Items</h3>
              <p className="text-4xl font-bold text-ras-azul">{inventory.length}</p>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        {inventory.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              {/* Buscador */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por objeto o etiquetas..."
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
                  value={filterSpace}
                  onChange={(e) => setFilterSpace(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:border-ras-turquesa focus:border-ras-turquesa focus:outline-none transition-colors cursor-pointer min-w-[200px]"
                >
                  <option value="all">📍 Todos los espacios</option>
                  <option value="sin-espacio">🔹 Sin espacio</option>
                  {uniqueSpaces.map(spaceId => (
                    <option key={spaceId} value={spaceId}>
                      {getSpaceName(spaceId)}
                    </option>
                  ))}
                </select>
                <svg className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Grid de inventario */}
        {filteredInventory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
              >
                {/* Imagen */}
                <div className="relative aspect-square">
                  <img
                    src={item.url}
                    alt={item.object_name || 'Item'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=Error"
                    }}
                  />

                  {/* Badge de espacio */}
                  {item.space_type && (
                    <div className="absolute top-3 left-3 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg">
                      {getSpaceName(item.space_type)}
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-4">
                  {/* Nombre del objeto */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {item.object_name || 'Objeto detectado'}
                  </h3>

                  {/* Etiquetas */}
                  {item.labels && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.labels.split(',').slice(0, 4).map((label, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded-lg bg-purple-100 text-purple-700 font-medium border border-purple-200"
                        >
                          {label.trim()}
                        </span>
                      ))}
                      {item.labels.split(',').length > 4 && (
                        <span className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
                          +{item.labels.split(',').length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botón eliminar detección */}
                  <button
                    onClick={() => handleClearDetection(item.id)}
                    className="w-full px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all text-sm font-semibold"
                  >
                    Limpiar detección
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={
              <svg className="w-16 h-16 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            }
            title={inventory.length === 0 ? "No hay items en el inventario" : "No se encontraron resultados"}
            description={inventory.length === 0 ? "Haz clic en 'Analizar Galería con IA' para detectar objetos automáticamente" : "Intenta con otra búsqueda o cambia los filtros"}
            actionLabel={inventory.length === 0 ? "🔍 Analizar Galería con IA" : undefined}
            onAction={inventory.length === 0 ? handleAnalyzeAll : undefined}
          />
        )}
      </main>
    </div>
  )
}
