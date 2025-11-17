'use client'

/**
 * TICKETS DE PROPIEDAD
 * Sistema completo de tickets/tareas para una propiedad específica
 * Maneja tanto pagos de servicios como tareas manuales
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/components/ui/confirm-modal'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'
import type { Ticket, TipoTicket, EstadoTicket, PrioridadTicket } from '@/types/ticket'
import { logger } from '@/lib/logger'

interface PropiedadInfo {
  id: string
  nombre: string
}

export default function TicketsPropiedad() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<PropiedadInfo | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsFiltrados, setTicketsFiltrados] = useState<Ticket[]>([])

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<EstadoTicket | 'todos'>('todos')
  const [filtroTipo, setFiltroTipo] = useState<TipoTicket | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')

  // Modal nuevo ticket
  const [showNuevoTicket, setShowNuevoTicket] = useState(false)
  const [ticketEditando, setTicketEditando] = useState<Ticket | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo_ticket: 'otro' as TipoTicket,
    prioridad: 'media' as PrioridadTicket,
    responsable: '',
    proveedor: '',
    fecha_programada: new Date().toISOString().split('T')[0],
    monto_estimado: '',
    estado: 'pendiente' as EstadoTicket
  })
  const [submitting, setSubmitting] = useState(false)

  // Cargar datos cuando el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && user && propiedadId) {
      cargarDatos()
    }
  }, [isAuthenticated, user, propiedadId])

  // Aplicar filtros cuando cambian tickets o filtros
  useEffect(() => {
    aplicarFiltros()
  }, [tickets, filtroEstado, filtroTipo, busqueda])

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)

      // Cargar información de la propiedad
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre')
        .eq('id', propiedadId)
        .single()

      if (propError) throw propError
      setPropiedad(propData)

      // Cargar tickets de la propiedad
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('propiedad_id', propiedadId)
        .order('fecha_programada', { ascending: true })

      if (ticketsError) {
        logger.error('Error cargando tickets:', ticketsError)
        toast.error('Error al cargar tickets')
        setTickets([])
      } else {
        setTickets(ticketsData || [])
      }
    } catch (error) {
      logger.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [propiedadId, toast])

  const aplicarFiltros = useCallback(() => {
    let resultado = [...tickets]

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(t => t.estado === filtroEstado)
    }

    // Filtro por tipo
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(t => t.tipo_ticket === filtroTipo)
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      resultado = resultado.filter(
        t =>
          t.titulo.toLowerCase().includes(termino) ||
          t.descripcion?.toLowerCase().includes(termino) ||
          t.responsable?.toLowerCase().includes(termino) ||
          t.proveedor?.toLowerCase().includes(termino)
      )
    }

    setTicketsFiltrados(resultado)
  }, [tickets, filtroEstado, filtroTipo, busqueda])

  const getDiasRestantes = useCallback((fechaProgramada: string) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fecha = new Date(fechaProgramada + 'T00:00:00')
    const diff = fecha.getTime() - hoy.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [])

  const getUrgenciaBadge = useCallback((diasRestantes: number, estado: EstadoTicket) => {
    if (estado === 'completado') {
      return {
        text: 'COMPLETADO',
        classes: 'bg-green-100 text-green-700 border-green-300'
      }
    }

    if (estado === 'cancelado') {
      return {
        text: 'CANCELADO',
        classes: 'bg-gray-100 text-gray-600 border-gray-300'
      }
    }

    if (diasRestantes < 0) {
      return {
        text: 'VENCIDO',
        classes: 'bg-red-100 text-red-700 border-red-300'
      }
    }

    if (diasRestantes === 0) {
      return {
        text: 'HOY',
        classes: 'bg-orange-100 text-orange-700 border-orange-300'
      }
    }

    if (diasRestantes <= 3) {
      return {
        text: 'PRÓXIMO',
        classes: 'bg-yellow-100 text-yellow-700 border-yellow-300'
      }
    }

    return {
      text: `${diasRestantes} días`,
      classes: 'bg-blue-100 text-blue-700 border-blue-300'
    }
  }, [])

  const getTipoIcon = useCallback((tipo: TipoTicket) => {
    const iconMap: Record<TipoTicket, string> = {
      pago: '💰',
      mantenimiento: '🔧',
      reparacion: '🛠️',
      limpieza: '🧹',
      inspeccion: '🔍',
      compra: '🛒',
      otro: '📋'
    }
    return iconMap[tipo] || '📋'
  }, [])

  const handleMarcarCompletado = async (ticketId: string) => {
    const confirmed = await confirm.success(
      '¿Marcar como completado?',
      'El ticket se marcará como completado'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          estado: 'completado',
          fecha_completado: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (error) throw error

      toast.success('Ticket marcado como completado')
      cargarDatos()
    } catch (error) {
      logger.error('Error al marcar ticket como completado:', error)
      toast.error('Error al completar ticket')
    }
  }

  const handleMarcarPagado = async (ticketId: string, pagado: boolean) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          pagado: !pagado,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (error) throw error

      toast.success(pagado ? 'Ticket marcado como no pagado' : 'Ticket marcado como pagado')
      cargarDatos()
    } catch (error) {
      logger.error('Error al actualizar estado de pago:', error)
      toast.error('Error al actualizar pago')
    }
  }

  const handleEliminarTicket = async (ticketId: string) => {
    const confirmed = await confirm.danger(
      '¿Eliminar ticket?',
      'Esta acción no se puede deshacer'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId)

      if (error) throw error

      toast.success('Ticket eliminado correctamente')
      cargarDatos()
    } catch (error) {
      logger.error('Error al eliminar ticket:', error)
      toast.error('Error al eliminar ticket')
    }
  }

  const volverPropiedad = () => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/home`)
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      tipo_ticket: 'otro',
      prioridad: 'media',
      responsable: '',
      proveedor: '',
      fecha_programada: new Date().toISOString().split('T')[0],
      monto_estimado: '',
      estado: 'pendiente'
    })
    setShowNuevoTicket(false)
    setTicketEditando(null)
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    if (!formData.titulo.trim()) {
      toast.error('El título es requerido')
      return
    }

    if (!formData.fecha_programada) {
      toast.error('La fecha programada es requerida')
      return
    }

    try {
      setSubmitting(true)

      const ticketData = {
        propiedad_id: propiedadId,
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim() || null,
        tipo_ticket: formData.tipo_ticket,
        prioridad: formData.prioridad,
        responsable: formData.responsable.trim() || null,
        proveedor: formData.proveedor.trim() || null,
        fecha_programada: formData.fecha_programada,
        monto_estimado: formData.monto_estimado ? parseFloat(formData.monto_estimado) : null,
        estado: formData.estado,
        pagado: false,
        creado_por: user?.email || null,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase.from('tickets').insert([ticketData])

      if (error) throw error

      toast.success('Ticket creado correctamente')
      resetForm()
      cargarDatos()
    } catch (error) {
      logger.error('Error al crear ticket:', error)
      toast.error('Error al crear ticket')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return <Loading message="Cargando tickets..." />
  }

  if (!propiedad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Propiedad no encontrada</h2>
          <button
            onClick={() => router.push('/dashboard/catalogo')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title={`Tickets - ${propiedad.nombre}`}
        showBackButton={true}
        onBack={volverPropiedad}
        showAddButton={true}
        onAddClick={() => setShowNuevoTicket(true)}
        addButtonText="Nuevo Ticket"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar tickets..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value as EstadoTicket | 'todos')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En Progreso</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Filtro Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value as TipoTicket | 'todos')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los tipos</option>
                <option value="pago">💰 Pago/Servicio</option>
                <option value="mantenimiento">🔧 Mantenimiento</option>
                <option value="reparacion">🛠️ Reparación</option>
                <option value="limpieza">🧹 Limpieza</option>
                <option value="inspeccion">🔍 Inspección</option>
                <option value="compra">🛒 Compra</option>
                <option value="otro">📋 Otro</option>
              </select>
            </div>

            {/* Resumen */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <strong className="text-gray-900">{ticketsFiltrados.length}</strong> tickets
                {filtroEstado !== 'todos' || filtroTipo !== 'todos' || busqueda
                  ? ` (${tickets.length} total)`
                  : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Tickets */}
        {ticketsFiltrados.length === 0 ? (
          <EmptyState
            title="No hay tickets"
            description={
              filtroEstado !== 'todos' || filtroTipo !== 'todos' || busqueda
                ? 'No hay tickets que coincidan con los filtros'
                : 'Crea tu primer ticket para comenzar'
            }
          />
        ) : (
          <div className="space-y-4">
            {ticketsFiltrados.map(ticket => {
              const diasRestantes = getDiasRestantes(ticket.fecha_programada)
              const urgencia = getUrgenciaBadge(diasRestantes, ticket.estado)

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getTipoIcon(ticket.tipo_ticket)}</span>
                        <h3 className="text-lg font-bold text-gray-900">{ticket.titulo}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${urgencia.classes}`}
                        >
                          {urgencia.text}
                        </span>
                        {ticket.pagado && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold border bg-green-100 text-green-700 border-green-300">
                            ✓ PAGADO
                          </span>
                        )}
                      </div>

                      {/* Descripción */}
                      {ticket.descripcion && (
                        <p className="text-gray-600 mb-3">{ticket.descripcion}</p>
                      )}

                      {/* Detalles */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Fecha:</span>
                          <p className="font-medium text-gray-900">
                            {new Date(ticket.fecha_programada).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        {ticket.monto_estimado && (
                          <div>
                            <span className="text-gray-500">Monto:</span>
                            <p className="font-medium text-gray-900">
                              ${ticket.monto_estimado.toLocaleString('es-MX')} MXN
                            </p>
                          </div>
                        )}

                        {ticket.responsable && (
                          <div>
                            <span className="text-gray-500">Responsable:</span>
                            <p className="font-medium text-gray-900">{ticket.responsable}</p>
                          </div>
                        )}

                        {ticket.proveedor && (
                          <div>
                            <span className="text-gray-500">Proveedor:</span>
                            <p className="font-medium text-gray-900">{ticket.proveedor}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 ml-4">
                      {ticket.estado !== 'completado' && (
                        <>
                          <button
                            onClick={() => handleMarcarCompletado(ticket.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            ✓ Completar
                          </button>

                          {ticket.monto_estimado && (
                            <button
                              onClick={() => handleMarcarPagado(ticket.id, ticket.pagado)}
                              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                ticket.pagado
                                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {ticket.pagado ? 'Marcar no pagado' : '💳 Marcar pagado'}
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => handleEliminarTicket(ticket.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal para crear ticket */}
      {showNuevoTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Nuevo Ticket</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Pago de agua, Reparar calentador, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Detalles adicionales sobre el ticket..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                />
              </div>

              {/* Tipo y Prioridad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo_ticket}
                    onChange={e =>
                      setFormData({ ...formData, tipo_ticket: e.target.value as TipoTicket })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={submitting}
                  >
                    <option value="pago">💰 Pago/Servicio</option>
                    <option value="mantenimiento">🔧 Mantenimiento</option>
                    <option value="reparacion">🛠️ Reparación</option>
                    <option value="limpieza">🧹 Limpieza</option>
                    <option value="inspeccion">🔍 Inspección</option>
                    <option value="compra">🛒 Compra</option>
                    <option value="otro">📋 Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={e =>
                      setFormData({ ...formData, prioridad: e.target.value as PrioridadTicket })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={submitting}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Fecha programada y Monto estimado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha programada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_programada}
                    onChange={e =>
                      setFormData({ ...formData, fecha_programada: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto estimado (MXN)
                  </label>
                  <input
                    type="number"
                    value={formData.monto_estimado}
                    onChange={e => setFormData({ ...formData, monto_estimado: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Responsable y Proveedor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={e => setFormData({ ...formData, responsable: e.target.value })}
                    placeholder="Nombre del responsable"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={formData.proveedor}
                    onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                    placeholder="Nombre del proveedor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Estado inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado inicial
                </label>
                <select
                  value={formData.estado}
                  onChange={e =>
                    setFormData({ ...formData, estado: e.target.value as EstadoTicket })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                </select>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Creando...' : 'Crear Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
