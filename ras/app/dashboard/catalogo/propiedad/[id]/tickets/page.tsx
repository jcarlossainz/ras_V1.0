'use client';

/**
 * Página de Calendario de Pagos
 * Plan C - Diseño consistente con el sistema RAS
 * Consultas directas a Supabase sin dependencias externas
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import TopBar from '@/components/ui/topbar';
import Loading from '@/components/ui/loading';
import EmptyState from '@/components/ui/emptystate';

interface Propiedad {
  id: string;
  nombre: string;
}

interface Pago {
  id: string;
  fecha_pago: string;
  monto_estimado: number;
  pagado: boolean;
  servicio: {
    nombre: string;
    tipo_servicio: string;
    numero_contrato: string;
  };
}

export default function CalendarioPagosPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const propiedadId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'vencido' | 'hoy' | 'proximo'>('todos');

  useEffect(() => {
    if (propiedadId) {
      cargarDatos();
    }
  }, [propiedadId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar información de la propiedad
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre')
        .eq('id', propiedadId)
        .single();

      if (propError) throw propError;
      setPropiedad(propData);

      // Cargar pagos pendientes con información del servicio
      const { data: pagosData, error: pagosError } = await supabase
        .from('fechas_pago_servicios')
        .select(`
          id,
          fecha_pago,
          monto_estimado,
          pagado,
          servicios_inmueble!inner(
            nombre,
            tipo_servicio,
            numero_contrato
          )
        `)
        .eq('propiedad_id', propiedadId)
        .eq('pagado', false)
        .order('fecha_pago', { ascending: true })
        .limit(50);

      if (pagosError) {
        console.error('Error cargando pagos:', pagosError);
        setPagos([]);
      } else {
        // Transformar datos para que sean más fáciles de usar
        const pagosTransformados = (pagosData || []).map(pago => ({
          id: pago.id,
          fecha_pago: pago.fecha_pago,
          monto_estimado: pago.monto_estimado,
          pagado: pago.pagado,
          servicio: {
            nombre: pago.servicios_inmueble.nombre,
            tipo_servicio: pago.servicios_inmueble.tipo_servicio,
            numero_contrato: pago.servicios_inmueble.numero_contrato
          }
        }));
        setPagos(pagosTransformados);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPagado = async (pagoId: string, monto: number) => {
    try {
      const { error } = await supabase
        .from('fechas_pago_servicios')
        .update({
          pagado: true,
          fecha_pago_real: new Date().toISOString().split('T')[0],
          monto_real: monto
        })
        .eq('id', pagoId);

      if (error) throw error;

      toast.success('Pago marcado como realizado');
      await cargarDatos();
    } catch (error) {
      console.error('Error marcando pago:', error);
      toast.error('Error al marcar el pago');
    }
  };

  const getEstadoUrgencia = (fechaPago: string): 'vencido' | 'hoy' | 'proximo' | 'futuro' => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaPago);
    fecha.setHours(0, 0, 0, 0);
    const diff = Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'vencido';
    if (diff === 0) return 'hoy';
    if (diff <= 7) return 'proximo';
    return 'futuro';
  };

  const getDiasRestantes = (fechaPago: string): number => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaPago);
    fecha.setHours(0, 0, 0, 0);
    return Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const pagosFiltrados = pagos.filter(pago => {
    if (filtro === 'todos') return true;
    return getEstadoUrgencia(pago.fecha_pago) === filtro;
  });

  const contadores = {
    vencido: pagos.filter(p => getEstadoUrgencia(p.fecha_pago) === 'vencido').length,
    hoy: pagos.filter(p => getEstadoUrgencia(p.fecha_pago) === 'hoy').length,
    proximo: pagos.filter(p => getEstadoUrgencia(p.fecha_pago) === 'proximo').length
  };

  const getTipoIcon = (tipo: string) => {
    const iconos: { [key: string]: string } = {
      agua: '💧',
      gas: '🔥',
      luz: '💡',
      internet: '📡',
      predial: '🏛️',
      cuota_condominio: '🏘️',
      mantenimiento_alberca: '🏊',
      cctv: '📹',
      seguro: '🛡️',
      fumigacion: '🐛',
      mantenimiento_aires: '❄️',
      impermeabilizacion: '☔'
    };
    return iconos[tipo] || '📋';
  };

  if (loading) {
    return <Loading message="Cargando calendario de pagos..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title={`📅 ${propiedad?.nombre || 'Calendario de Pagos'}`}
        showBackButton
        onBackClick={() => router.push('/dashboard/catalogo')}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tarjetas de Resumen - Estilo Plan C */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Vencidos */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 overflow-hidden transition-all hover:shadow-xl hover:scale-105">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Vencidos</p>
                  <p className="text-4xl font-bold mt-1">{contadores.vencido}</p>
                </div>
                <div className="text-5xl opacity-90">🔴</div>
              </div>
            </div>
            <div className="p-4 bg-red-50">
              <p className="text-sm text-red-700 font-medium">Requieren atención inmediata</p>
            </div>
          </div>

          {/* Hoy */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 overflow-hidden transition-all hover:shadow-xl hover:scale-105">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Hoy</p>
                  <p className="text-4xl font-bold mt-1">{contadores.hoy}</p>
                </div>
                <div className="text-5xl opacity-90">⏰</div>
              </div>
            </div>
            <div className="p-4 bg-orange-50">
              <p className="text-sm text-orange-700 font-medium">Vencen el día de hoy</p>
            </div>
          </div>

          {/* Próximos 7 días */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-yellow-200 overflow-hidden transition-all hover:shadow-xl hover:scale-105">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Próximos 7 días</p>
                  <p className="text-4xl font-bold mt-1">{contadores.proximo}</p>
                </div>
                <div className="text-5xl opacity-90">📅</div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50">
              <p className="text-sm text-yellow-700 font-medium">Próximamente</p>
            </div>
          </div>
        </div>

        {/* Filtros - Estilo Plan C */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setFiltro('todos')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
                filtro === 'todos'
                  ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({pagos.length})
            </button>
            <button
              onClick={() => setFiltro('vencido')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
                filtro === 'vencido'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vencidos ({contadores.vencido})
            </button>
            <button
              onClick={() => setFiltro('hoy')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
                filtro === 'hoy'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoy ({contadores.hoy})
            </button>
            <button
              onClick={() => setFiltro('proximo')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
                filtro === 'proximo'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Próximos ({contadores.proximo})
            </button>
          </div>
        </div>

        {/* Lista de pagos */}
        {pagosFiltrados.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No hay pagos pendientes"
            message={
              filtro === 'todos'
                ? 'Todo está al día. Puedes agregar servicios desde el wizard de edición.'
                : `No hay pagos en estado "${filtro}"`
            }
            actionLabel="Gestionar Servicios"
            onAction={() => router.push(`/dashboard/propiedad/${propiedadId}`)}
          />
        ) : (
          <div className="space-y-4">
            {pagosFiltrados.map((pago) => {
              const estado = getEstadoUrgencia(pago.fecha_pago);
              const diasRestantes = getDiasRestantes(pago.fecha_pago);
              
              const colorClasses = {
                vencido: 'border-red-300 bg-red-50',
                hoy: 'border-orange-300 bg-orange-50',
                proximo: 'border-yellow-300 bg-yellow-50',
                futuro: 'border-gray-300 bg-gray-50'
              }[estado];

              const badgeClasses = {
                vencido: 'bg-red-500 text-white',
                hoy: 'bg-orange-500 text-white',
                proximo: 'bg-yellow-500 text-white',
                futuro: 'bg-gray-500 text-white'
              }[estado];

              return (
                <div
                  key={pago.id}
                  className={`bg-white rounded-xl shadow-md border-2 ${colorClasses} p-6 transition-all hover:shadow-xl hover:scale-[1.02]`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Info del servicio */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-ras-azul to-ras-turquesa flex items-center justify-center text-3xl shadow-lg">
                          {getTipoIcon(pago.servicio.tipo_servicio)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 font-poppins">
                            {pago.servicio.nombre}
                          </h3>
                          <p className="text-sm text-gray-600 capitalize">
                            {pago.servicio.tipo_servicio.replace('_', ' ')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClasses} ml-auto`}>
                          {estado === 'vencido' && '¡VENCIDO!'}
                          {estado === 'hoy' && 'HOY'}
                          {estado === 'proximo' && 'PRÓXIMO'}
                          {estado === 'futuro' && 'FUTURO'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white/50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Fecha de pago</p>
                          <p className="text-sm font-bold text-gray-900">
                            {new Date(pago.fecha_pago).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="bg-white/50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Monto</p>
                          <p className="text-sm font-bold text-gray-900">
                            ${pago.monto_estimado.toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>

                        <div className="bg-white/50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Días</p>
                          <p className="text-sm font-bold text-gray-900">
                            {diasRestantes === 0
                              ? 'Hoy'
                              : diasRestantes > 0
                              ? `En ${diasRestantes}d`
                              : `${Math.abs(diasRestantes)}d atrás`}
                          </p>
                        </div>

                        <div className="bg-white/50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Contrato</p>
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {pago.servicio.numero_contrato || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleMarcarPagado(pago.id, pago.monto_estimado)}
                        className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm whitespace-nowrap flex items-center gap-2"
                      >
                        <span>✓</span>
                        Marcar pagado
                      </button>
                      <button className="px-4 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-lg hover:opacity-90 transition-all shadow-md hover:shadow-lg font-semibold text-sm whitespace-nowrap flex items-center gap-2">
                        <span>🔗</span>
                        Link a pago
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}