/**
 * Tipos TypeScript para el sistema de Tickets/Tareas
 * Basado en la tabla `tickets` de Supabase
 */

export type TipoTicket =
  | 'pago'
  | 'mantenimiento'
  | 'reparacion'
  | 'limpieza'
  | 'inspeccion'
  | 'compra'
  | 'otro';

export type PrioridadTicket = 'baja' | 'media' | 'alta' | 'urgente';

export type EstadoTicket = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';

export interface Ticket {
  id: string;
  propiedad_id: string;

  // Datos del ticket
  titulo: string;
  descripcion?: string | null;
  tipo_ticket: TipoTicket;
  prioridad: PrioridadTicket;

  // Asignación
  responsable?: string | null;  // Nombre del responsable
  proveedor?: string | null;    // Nombre del proveedor (si aplica)
  creado_por?: string | null;

  // Fechas
  fecha_programada: string;     // YYYY-MM-DD
  fecha_completado?: string | null;

  // Estado y pago
  estado: EstadoTicket;
  pagado: boolean;

  // Montos
  monto_estimado?: number | null;
  monto_real?: number | null;

  // Referencia a servicio (si viene de servicio recurrente)
  servicio_id?: string | null;

  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface TicketFormData {
  titulo: string;
  descripcion?: string;
  tipo_ticket: TipoTicket;
  prioridad: PrioridadTicket;
  responsable?: string;
  proveedor?: string;
  fecha_programada: string;
  monto_estimado?: number;
  estado?: EstadoTicket;
}

export interface TicketWithPropiedad extends Ticket {
  propiedad_nombre: string;
  dias_restantes: number;
}
