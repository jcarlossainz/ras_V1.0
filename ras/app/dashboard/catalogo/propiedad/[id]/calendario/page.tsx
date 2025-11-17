'use client';

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

interface EventoCalendario {
  id: string;
  tipo: 'pago_servicio' | 'pago_renta' | 'vencimiento_contrato' | 'ticket';
  titulo: string;
  descripcion: string;
  fecha: string;
  monto?: number;
  estado: 'pendiente' | 'completado' | 'vencido';
  icono: string;
  color: string;
}

type VistaCalendario = 'calendario' | 'listado';

export default function CalendarioPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const propiedadId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [vista, setVista] = useState<VistaCalendario>('calendario');
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);

  useEffect(() => {
    if (propiedadId) {
      cargarDatos();
    }
  }, [propiedadId, mesActual]);

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

      await cargarEventos();

    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarEventos = async () => {
    try {
      const eventosTemp: EventoCalendario[] = [];

      // Cargar pagos de servicios
      const inicioMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
      const finMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

      const { data: pagosData, error: pagosError } = await supabase
        .from('fechas_pago_servicios')
        .select(`
          id,
          fecha_pago,
          monto_estimado,
          pagado,
          servicios_inmueble (
            nombre,
            tipo_servicio
          )
        `)
        .eq('propiedad_id', propiedadId)
        .gte('fecha_pago', inicioMes.toISOString().split('T')[0])
        .lte('fecha_pago', finMes.toISOString().split('T')[0])
        .order('fecha_pago', { ascending: true });

      if (pagosError) {
        console.error('Error cargando pagos:', pagosError);
      }

      if (pagosData && Array.isArray(pagosData)) {
        pagosData.forEach((pago: any) => {
          // Verificar que servicios_inmueble existe y tiene datos
          if (!pago.servicios_inmueble) {
            console.warn('Pago sin servicio asociado:', pago.id);
            return;
          }

          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const fechaPago = new Date(pago.fecha_pago);
          fechaPago.setHours(0, 0, 0, 0);
          
          let estado: 'pendiente' | 'completado' | 'vencido' = 'pendiente';
          if (pago.pagado) {
            estado = 'completado';
          } else if (fechaPago < hoy) {
            estado = 'vencido';
          }

          const servicio = pago.servicios_inmueble;
          const nombreServicio = servicio?.nombre || 'Servicio sin nombre';
          const tipoServicio = servicio?.tipo_servicio || 'general';

          eventosTemp.push({
            id: pago.id,
            tipo: 'pago_servicio',
            titulo: nombreServicio,
            descripcion: `Pago de ${tipoServicio.replace('_', ' ')}`,
            fecha: pago.fecha_pago,
            monto: pago.monto_estimado,
            estado,
            icono: getTipoIcon(tipoServicio),
            color: getEstadoColor(estado)
          });
        });
      }

      setEventos(eventosTemp);

    } catch (error) {
      console.error('Error cargando eventos:', error);
      toast.error('Error al cargar eventos');
    }
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

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vencido':
        return 'red';
      case 'completado':
        return 'green';
      case 'pendiente':
      default:
        return 'blue';
    }
  };

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    const nuevoMes = new Date(mesActual);
    if (direccion === 'anterior') {
      nuevoMes.setMonth(mesActual.getMonth() - 1);
    } else {
      nuevoMes.setMonth(mesActual.getMonth() + 1);
    }
    setMesActual(nuevoMes);
    setDiaSeleccionado(null);
  };

  const irAHoy = () => {
    setMesActual(new Date());
    setDiaSeleccionado(new Date());
  };

  const getDiasDelMes = () => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasDelMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();

    const dias = [];
    
    // Días vacíos antes del primer día
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }
    
    // Días del mes
    for (let dia = 1; dia <= diasDelMes; dia++) {
      dias.push(new Date(year, month, dia));
    }

    return dias;
  };

  const getEventosDia = (fecha: Date | null) => {
    if (!fecha) return [];
    const fechaStr = fecha.toISOString().split('T')[0];
    return eventos.filter(e => e.fecha === fechaStr);
  };

  const esHoy = (fecha: Date | null) => {
    if (!fecha) return false;
    const hoy = new Date();
    return (
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear()
    );
  };

  const esMismoMes = (fecha: Date | null) => {
    if (!fecha) return false;
    return fecha.getMonth() === mesActual.getMonth();
  };

  if (loading) {
    return <Loading message="Cargando calendario..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title={`📅 ${propiedad?.nombre || 'Calendario'}`}
        showBackButton
        onBackClick={() => router.push('/dashboard/catalogo')}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controles superiores */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            
            {/* Selector de vista */}
            <div className="flex gap-2">
              <button
                onClick={() => setVista('calendario')}
                className={`px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  vista === 'calendario'
                    ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>📅</span>
                Calendario
              </button>
              <button
                onClick={() => setVista('listado')}
                className={`px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  vista === 'listado'
                    ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>📋</span>
                Listado
              </button>
            </div>

            {/* Navegación de mes */}
            {vista === 'calendario' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cambiarMes('anterior')}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ←
                </button>
                <div className="text-center min-w-[180px]">
                  <p className="text-xl font-bold text-gray-900 font-poppins capitalize">
                    {mesActual.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => cambiarMes('siguiente')}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  →
                </button>
                <button
                  onClick={irAHoy}
                  className="px-4 py-2 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-lg hover:opacity-90 transition-all shadow-md font-semibold text-sm"
                >
                  Hoy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* VISTA CALENDARIO */}
        {vista === 'calendario' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Encabezado de días de la semana */}
            <div className="grid grid-cols-7 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
                <div key={dia} className="p-3 text-center font-semibold text-sm">
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
              {getDiasDelMes().map((fecha, index) => {
                const eventosDia = getEventosDia(fecha);
                const isHoy = esHoy(fecha);
                const isMismoMes = esMismoMes(fecha);

                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 transition-all ${
                      fecha ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                    } ${!isMismoMes ? 'opacity-40' : ''}`}
                    onClick={() => fecha && setDiaSeleccionado(fecha)}
                  >
                    {fecha && (
                      <>
                        {/* Número del día */}
                        <div className={`text-right mb-2 ${
                          isHoy
                            ? 'w-8 h-8 ml-auto rounded-full bg-gradient-to-r from-ras-azul to-ras-turquesa text-white flex items-center justify-center font-bold'
                            : 'font-semibold text-gray-700'
                        }`}>
                          {fecha.getDate()}
                        </div>

                        {/* Eventos del día */}
                        <div className="space-y-1">
                          {eventosDia.slice(0, 3).map(evento => (
                            <div
                              key={evento.id}
                              className={`text-xs px-2 py-1 rounded truncate ${
                                evento.color === 'red'
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : evento.color === 'green'
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-blue-100 text-blue-700 border border-blue-300'
                              }`}
                              title={`${evento.titulo} - ${evento.descripcion}`}
                            >
                              {evento.icono} {evento.titulo}
                            </div>
                          ))}
                          {eventosDia.length > 3 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{eventosDia.length - 3} más
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VISTA LISTADO */}
        {vista === 'listado' && (
          <div className="space-y-4">
            {eventos.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No hay eventos programados"
                message="Los eventos de pagos, vencimientos y tickets aparecerán aquí cuando agregues servicios a la propiedad."
              />
            ) : (
              eventos.map(evento => (
                <div
                  key={evento.id}
                  className={`bg-white rounded-xl shadow-md border-2 p-5 transition-all hover:shadow-xl hover:scale-[1.02] ${
                    evento.color === 'red'
                      ? 'border-red-300 bg-red-50'
                      : evento.color === 'green'
                      ? 'border-green-300 bg-green-50'
                      : 'border-blue-300 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-ras-azul to-ras-turquesa flex items-center justify-center text-3xl shadow-lg">
                        {evento.icono}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 font-poppins">
                          {evento.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">{evento.descripcion}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-medium text-gray-700">
                            📅 {new Date(evento.fecha).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          {evento.monto && evento.monto > 0 && (
                            <span className="font-bold text-gray-900">
                              💰 ${evento.monto.toLocaleString('es-MX', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                        evento.estado === 'vencido'
                          ? 'bg-red-500 text-white'
                          : evento.estado === 'completado'
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {evento.estado === 'vencido' && '¡VENCIDO!'}
                        {evento.estado === 'completado' && '✓ COMPLETADO'}
                        {evento.estado === 'pendiente' && 'PENDIENTE'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Panel de detalles del día seleccionado */}
        {vista === 'calendario' && diaSeleccionado && (
          <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 font-poppins">
                📅 {diaSeleccionado.toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              <button
                onClick={() => setDiaSeleccionado(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {getEventosDia(diaSeleccionado).length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay eventos programados para este día
                </p>
              ) : (
                getEventosDia(diaSeleccionado).map(evento => (
                  <div
                    key={evento.id}
                    className={`p-4 rounded-lg border-2 ${
                      evento.color === 'red'
                        ? 'border-red-300 bg-red-50'
                        : evento.color === 'green'
                        ? 'border-green-300 bg-green-50'
                        : 'border-blue-300 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{evento.icono}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{evento.titulo}</p>
                        <p className="text-sm text-gray-600 capitalize">{evento.descripcion}</p>
                        {evento.monto && evento.monto > 0 && (
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            ${evento.monto.toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        evento.estado === 'vencido'
                          ? 'bg-red-500 text-white'
                          : evento.estado === 'completado'
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {evento.estado.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}