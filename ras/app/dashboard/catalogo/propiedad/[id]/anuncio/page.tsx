'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import Button from '@/components/ui/button'

interface Espacio {
  id: string
  name: string
  type: string
  details?: {
    camas?: Array<{ id: number; tipo: string }>
    equipamiento?: string[]
    notas?: string
    capacidadPersonas?: number
    tieneBanoPrivado?: boolean
    banoPrivadoId?: string | null
  }
}

interface PropiedadData {
  id: string
  nombre: string
  tipo_propiedad: string
  estados: string[]
  mobiliario: string
  capacidad_personas: number | null
  tamano_terreno: number | null
  tamano_terreno_unit: string | null
  tamano_construccion: number | null
  tamano_construccion_unit: string | null
  
  // Ubicación
  colonia: string | null
  codigo_postal: string | null
  ciudad: string | null
  estado: string | null
  
  // Comercial
  costo_renta_mensual: number | null
  precio_noche: number | null
  amenidades_vacacional: string[] | null
  precio_venta: number | null
  
  // Espacios
  espacios: Espacio[] | null
  
  // Anuncio
  descripcion_anuncio: string | null
  estado_anuncio: string | null
}

interface Contacto {
  nombre: string
  telefono: string
  email: string
}

interface Foto {
  url: string
  url_thumbnail: string
  is_cover: boolean
}

export default function AnuncioPublico() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const propiedadId = params?.id as string
  
  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<PropiedadData | null>(null)
  const [propietario, setPropietario] = useState<Contacto | null>(null)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [fotoActual, setFotoActual] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarPropiedad()
  }, [])

  const cargarPropiedad = async () => {
    try {
      // Cargar propiedad sin autenticación
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', propiedadId)
        .eq('estado_anuncio', 'publicado') // Solo mostrar si está publicado
        .single()

      if (propError) {
        setError('Anuncio no disponible o no publicado')
        setLoading(false)
        return
      }
      
      setPropiedad(propData)
      
      // Cargar fotos de la propiedad
      const { data: fotosData } = await supabase
        .from('property_images')
        .select('url, url_thumbnail, is_cover')
        .eq('property_id', propiedadId)
        .order('is_cover', { ascending: false })
        .order('created_at', { ascending: true })
      
      if (fotosData && fotosData.length > 0) {
        setFotos(fotosData)
      }
      
      // Cargar información del propietario si existe
      if (propData.propietario_id) {
        const { data: propietarioData } = await supabase
          .from('contactos')
          .select('nombre, telefono, email')
          .eq('id', propData.propietario_id)
          .single()
        
        if (propietarioData) {
          setPropietario(propietarioData)
        }
      }
      
    } catch (error: any) {
      logger.error('Error cargando anuncio:', error)
      setError('Error al cargar el anuncio')
    } finally {
      setLoading(false)
    }
  }

  const contactarWhatsApp = () => {
    if (!propietario?.telefono) {
      toast.error('No hay teléfono de contacto disponible')
      return
    }
    
    const mensaje = `Hola, me interesa la propiedad: ${propiedad?.nombre}`
    const numero = propietario.telefono.replace(/\D/g, '') // Eliminar todo excepto números
    const whatsappUrl = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    window.open(whatsappUrl, '_blank')
    toast.success('Abriendo WhatsApp...')
  }

  const enviarCorreo = () => {
    if (!propietario?.email) {
      toast.error('No hay email de contacto disponible')
      return
    }
    
    const asunto = `Interés en: ${propiedad?.nombre}`
    const cuerpo = `Hola, me interesa obtener más información sobre esta propiedad.`
    const mailtoUrl = `mailto:${propietario.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    window.location.href = mailtoUrl
  }

  const llamar = () => {
    if (!propietario?.telefono) {
      toast.error('No hay teléfono de contacto disponible')
      return
    }
    
    window.location.href = `tel:${propietario.telefono}`
  }

  const compartir = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: propiedad?.nombre || 'Propiedad en venta/renta',
          text: `Mira esta propiedad: ${propiedad?.nombre}`,
          url: url
        })
        toast.success('Compartido exitosamente')
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          copiarLink()
        }
      }
    } else {
      copiarLink()
    }
  }

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('Link copiado al portapapeles')
    }).catch(() => {
      toast.error('No se pudo copiar el link')
    })
  }

  const siguienteFoto = () => {
    setFotoActual((prev) => (prev + 1) % fotos.length)
  }

  const anteriorFoto = () => {
    setFotoActual((prev) => (prev - 1 + fotos.length) % fotos.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema flex items-center justify-center">
        <Loading message="Cargando anuncio..." />
      </div>
    )
  }

  if (error || !propiedad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Anuncio no disponible</h2>
          <p className="text-gray-600">{error || 'El anuncio que buscas no está publicado o no existe.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      
      <TopBar 
        title={propiedad.nombre}
        showBackButton={true}
        onBack={() => window.history.back()}
        showUserInfo={false}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Galería de fotos */}
            {fotos.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
                <div className="relative h-96 bg-gray-200">
                  <img
                    src={fotos[fotoActual]?.url || fotos[fotoActual]?.url_thumbnail}
                    alt={`Foto ${fotoActual + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/800x600/f3f4f6/9ca3af?text=Sin+foto"
                    }}
                  />
                  
                  {/* Controles de navegación */}
                  {fotos.length > 1 && (
                    <>
                      <button
                        onClick={anteriorFoto}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={siguienteFoto}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Indicador de foto */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white rounded-full text-sm font-medium">
                        {fotoActual + 1} / {fotos.length}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Miniaturas */}
                {fotos.length > 1 && (
                  <div className="p-4 flex gap-2 overflow-x-auto">
                    {fotos.map((foto, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFotoActual(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === fotoActual ? 'border-ras-azul' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={foto.url_thumbnail}
                          alt={`Miniatura ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/80x80/f3f4f6/9ca3af?text=?"
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
                <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg className="w-24 h-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg">Sin fotos disponibles</p>
                  </div>
                </div>
              </div>
            )}

            {/* Precio */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <div className="flex items-baseline gap-3">
                {propiedad.precio_venta && (
                  <div>
                    <span className="text-sm text-gray-600">Precio de venta</span>
                    <p className="text-4xl font-bold text-ras-azul">
                      ${propiedad.precio_venta.toLocaleString('es-MX')}
                    </p>
                  </div>
                )}
                {propiedad.costo_renta_mensual && (
                  <div>
                    <span className="text-sm text-gray-600">Renta mensual</span>
                    <p className="text-4xl font-bold text-ras-azul">
                      ${propiedad.costo_renta_mensual.toLocaleString('es-MX')}
                    </p>
                  </div>
                )}
                {propiedad.precio_noche && (
                  <div>
                    <span className="text-sm text-gray-600">Precio por noche</span>
                    <p className="text-4xl font-bold text-ras-azul">
                      USD {propiedad.precio_noche.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Descripción */}
            {propiedad.descripcion_anuncio && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Descripción</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {propiedad.descripcion_anuncio}
                </p>
              </div>
            )}

            {/* Detalles */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalles</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                    <span className="text-xs text-blue-700 font-medium">Tipo</span>
                  </div>
                  <p className="font-bold text-gray-900 capitalize">{propiedad.tipo_propiedad}</p>
                </div>
                
                {propiedad.mobiliario && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      <span className="text-xs text-purple-700 font-medium">Mobiliario</span>
                    </div>
                    <p className="font-bold text-gray-900 capitalize">{propiedad.mobiliario}</p>
                  </div>
                )}
                
                {propiedad.capacidad_personas && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <span className="text-xs text-green-700 font-medium">Capacidad</span>
                    </div>
                    <p className="font-bold text-gray-900">{propiedad.capacidad_personas} personas</p>
                  </div>
                )}
                
                {propiedad.tamano_construccion && (
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                      <span className="text-xs text-orange-700 font-medium">Construcción</span>
                    </div>
                    <p className="font-bold text-gray-900">
                      {propiedad.tamano_construccion} {propiedad.tamano_construccion_unit}
                    </p>
                  </div>
                )}
                
                {propiedad.tamano_terreno && (
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                      <span className="text-xs text-teal-700 font-medium">Terreno</span>
                    </div>
                    <p className="font-bold text-gray-900">
                      {propiedad.tamano_terreno} {propiedad.tamano_terreno_unit}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Espacios */}
            {propiedad.espacios && propiedad.espacios.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Espacios</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {propiedad.espacios.map((espacio) => (
                    <div key={espacio.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                      <div className="mb-3">
                        <h3 className="font-bold text-gray-900 text-lg">{espacio.name}</h3>
                        <span className="text-xs text-gray-600 font-medium uppercase bg-gray-200 px-2 py-1 rounded">
                          {espacio.type}
                        </span>
                      </div>
                      
                      {espacio.details && (
                        <div className="space-y-2 text-sm text-gray-700">
                          {espacio.details.capacidadPersonas && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>{espacio.details.capacidadPersonas} personas</span>
                            </div>
                          )}
                          
                          {espacio.details.camas && espacio.details.camas.length > 0 && (
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-gray-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              <span>{espacio.details.camas.map(c => c.tipo).join(', ')}</span>
                            </div>
                          )}
                          
                          {espacio.details.tieneBanoPrivado && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-700 font-medium">Baño privado</span>
                            </div>
                          )}
                          
                          {espacio.details.equipamiento && espacio.details.equipamiento.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 font-semibold mb-1">Equipamiento:</p>
                              <div className="flex flex-wrap gap-1">
                                {espacio.details.equipamiento.map((eq, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    {eq}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {espacio.details.notas && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-600 italic">{espacio.details.notas}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenidades vacacionales */}
            {propiedad.amenidades_vacacional && propiedad.amenidades_vacacional.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenidades</h2>
                
                <div className="flex flex-wrap gap-2">
                  {propiedad.amenidades_vacacional.map((amenidad, idx) => (
                    <span key={idx} className="px-4 py-2 bg-cyan-50 text-cyan-800 rounded-full text-sm font-medium border border-cyan-200">
                      {amenidad}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ubicación */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ubicación</h2>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-700 leading-relaxed">
                    {propiedad.colonia && `${propiedad.colonia}, `}
                    {propiedad.ciudad && `${propiedad.ciudad}, `}
                    {propiedad.estado}
                    {propiedad.codigo_postal && (
                      <>
                        <br />
                        <span className="text-gray-600 text-sm">CP: {propiedad.codigo_postal}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar - Contacto */}
          <div className="space-y-6">
            
            {/* Card de contacto sticky */}
            <div className="sticky top-24 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl border-2 border-green-200 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Te interesa?</h3>
                <p className="text-gray-600">Contáctanos para más información</p>
              </div>
              
              {propietario && (
                <div className="bg-white rounded-xl p-4 mb-6 border-2 border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Contacto</p>
                  <p className="font-bold text-gray-900 text-lg">{propietario.nombre}</p>
                  {propietario.telefono && (
                    <p className="text-gray-700 text-sm mt-2">📱 {propietario.telefono}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-3">
                <Button
                  onClick={contactarWhatsApp}
                  variant="success"
                  size="lg"
                  className="w-full"
                >
                  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </Button>
                
                <Button
                  onClick={llamar}
                  variant="primary"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Llamar
                </Button>
                
                <Button
                  onClick={enviarCorreo}
                  variant="secondary"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Enviar Email
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-green-200">
                <Button
                  onClick={compartir}
                  variant="ghost"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Compartir anuncio
                </Button>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            Anuncio publicado con <span className="text-red-400">♥</span> usando RAS V_1.0
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Sistema de Administración de Propiedades
          </p>
        </div>
      </footer>

    </div>
  )
}