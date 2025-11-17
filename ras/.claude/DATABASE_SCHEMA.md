# 🗄️ DATABASE SCHEMA - RAS v1.0

**Sistema:** RAS - Realty Administration System
**Base de Datos:** Supabase (PostgreSQL)
**Versión del Schema:** 1.0.0
**Fecha:** 17 de Noviembre 2025
**Estado:** Documentación completa

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Diagrama de Relaciones](#diagrama-de-relaciones)
3. [Tablas Principales](#tablas-principales)
   - [propiedades](#tabla-propiedades)
   - [profiles](#tabla-profiles)
   - [property_images](#tabla-property_images)
   - [servicios_inmueble](#tabla-servicios_inmueble)
   - [fechas_pago_servicios](#tabla-fechas_pago_servicios)
   - [tickets](#tabla-tickets)
   - [propiedades_colaboradores](#tabla-propiedades_colaboradores)
   - [contactos](#tabla-contactos)
   - [documentos](#tabla-documentos)
4. [Tablas Pendientes de Crear](#tablas-pendientes)
5. [Vistas](#vistas)
6. [Contratos de Datos (TypeScript)](#contratos-typescript)
7. [Flujo de Datos](#flujo-de-datos)
8. [Row Level Security (RLS)](#row-level-security)
9. [Índices y Optimizaciones](#indices)
10. [Notas Técnicas](#notas-tecnicas)

---

## 📊 RESUMEN EJECUTIVO

### Tablas Existentes

| Tabla | Estado | Propósito | RLS |
|-------|--------|-----------|-----|
| `propiedades` | ✅ Activa | Tabla principal de inmuebles | ⚠️ Desactivado |
| `profiles` | ✅ Activa | Perfiles de usuarios | ⚠️ Desactivado |
| `property_images` | ✅ Activa | Galería de fotos de propiedades | ⚠️ Desactivado |
| `servicios_inmueble` | ✅ Activa | Servicios de inmuebles | ⚠️ Desactivado |
| `fechas_pago_servicios` | ✅ Activa | Calendario de pagos de servicios | ⚠️ Desactivado |
| `tickets` | ✅ Activa | Tareas y tickets pendientes | ⚠️ Desactivado |
| `propiedades_colaboradores` | ✅ Activa | Colaboradores por propiedad | ⚠️ Desactivado |
| `contactos` | ✅ Activa | Directorio de contactos | ⚠️ Desactivado |
| `documentos` | ✅ Activa | Documentos adjuntos | ⚠️ Desactivado |

### Tablas Pendientes de Crear

| Tabla | Prioridad | Fase | Propósito |
|-------|-----------|------|-----------|
| `eventos_calendario` | Alta | 4.2 | Eventos y fechas importantes |
| `inventarios` | Alta | 4.4 | Inventario de objetos con IA |
| `transacciones` | Alta | 4.7 | Ingresos y egresos |
| `anuncios_publicos` | Media | 4.6 | Anuncios publicados |
| `configuracion_widgets` | Baja | 6 | Preferencias de dashboard |

### Vistas SQL

| Vista | Estado | Propósito |
|-------|--------|-----------|
| `v_proximos_pagos` | ✅ Activa | Próximos pagos de servicios |

---

## 🔗 DIAGRAMA DE RELACIONES

```
┌─────────────────┐
│    profiles     │
│  (usuarios)     │
└────────┬────────┘
         │
         │ owner_id / user_id
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────┐
│  propiedades    │◄─────┤ propiedades_         │
│  (inmuebles)    │      │ colaboradores        │
└────────┬────────┘      └──────────────────────┘
         │
         │ propiedad_id
         ├────────────┬──────────────┬─────────────┬──────────────┐
         │            │              │             │              │
         ▼            ▼              ▼             ▼              ▼
┌──────────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐
│ property_    │ │ servicios_ │ │ tickets │ │ eventos_ │ │ inventarios│
│ images       │ │ inmueble   │ │         │ │calendario│ │            │
│ (fotos)      │ │            │ │(tareas) │ │(futuro)  │ │  (futuro)  │
└──────────────┘ └─────┬──────┘ └─────────┘ └──────────┘ └────────────┘
                       │
                       │ servicio_id
                       ▼
                ┌──────────────────┐
                │ fechas_pago_     │
                │ servicios        │
                │ (calendario)     │
                └──────────────────┘

┌─────────────────┐      ┌──────────────────┐
│   contactos     │      │   documentos     │
│  (directorio)   │      │   (archivos)     │
└─────────────────┘      └──────────────────┘
```

---

## 📑 TABLAS PRINCIPALES

---

### TABLA: `propiedades`

**Descripción:** Tabla principal que almacena toda la información de los inmuebles.

#### Estructura de Campos

```sql
CREATE TABLE propiedades (
  -- ===== IDENTIFICACIÓN =====
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID REFERENCES profiles(id) ON DELETE CASCADE,
  empresa_id            UUID NULL,

  -- ===== STEP 1: DATOS GENERALES =====
  nombre_propiedad      TEXT NOT NULL,
  tipo_propiedad        TEXT,
  mobiliario            TEXT,

  dimensiones           JSONB, -- {terreno: {valor, unidad}, construccion: {valor, unidad}}

  estados               TEXT[], -- ['Renta largo plazo', 'Venta', etc.]
  propietarios_email    TEXT[],
  supervisores_email    TEXT[],

  -- ===== STEP 2: UBICACIÓN =====
  ubicacion             JSONB, -- {calle, colonia, codigo_postal, ciudad, estado, pais, google_maps_link, referencias, es_complejo, nombre_complejo, amenidades_complejo}

  -- ===== STEP 3: ESPACIOS =====
  espacios              JSONB[], -- [{id, name, type, details: {equipamiento, camas, tieneBanoPrivado}}]

  -- ===== STEP 4: CONDICIONALES (Renta Largo Plazo) =====
  precios               JSONB, -- {mensual, noche, venta}

  inquilinos_email      TEXT[],
  fecha_inicio_contrato DATE,
  duracion_contrato_valor INTEGER,
  duracion_contrato_unidad TEXT, -- 'meses' | 'años'
  frecuencia_pago       TEXT, -- 'mensual' | 'quincenal' | 'semanal'
  dia_pago              INTEGER,

  precio_renta_disponible NUMERIC(10,2),
  requisitos_renta      TEXT[],
  requisitos_renta_custom TEXT[],

  amenidades_vacacional TEXT[],

  -- ===== STEP 5: SERVICIOS =====
  servicios             JSONB[], -- [{id, nombre, proveedor, costo, frecuencia}]

  -- ===== STEP 6: GALERÍA =====
  -- Las fotos están en tabla separada: property_images

  -- ===== METADATA DEL WIZARD =====
  wizard_step           INTEGER DEFAULT 1,
  wizard_completed      BOOLEAN DEFAULT FALSE,
  is_draft              BOOLEAN DEFAULT TRUE,

  -- ===== TIMESTAMPS =====
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);
```

#### Campos JSON Detallados

**1. `dimensiones` (JSONB)**
```typescript
{
  terreno: {
    valor: number,
    unidad: 'm²' | 'ft²'
  },
  construccion: {
    valor: number,
    unidad: 'm²' | 'ft²'
  }
}
```

**2. `ubicacion` (JSONB)**
```typescript
{
  calle: string,
  colonia: string,
  codigo_postal: string,
  ciudad: string,
  estado: string,
  pais: string,
  google_maps_link: string,
  referencias: string,
  es_complejo: boolean,
  nombre_complejo?: string,
  amenidades_complejo?: string[]
}
```

**3. `espacios` (JSONB[])**
```typescript
[{
  id: string,
  name: string,
  type: SpaceType,
  category?: string,
  description?: string,
  icon?: string,
  quantity?: number,
  features?: string[],
  details: {
    equipamiento: string[],
    camas?: Array<{tipo: string, id: number}>,
    tieneBanoPrivado?: boolean,
    banoPrivadoId?: string | null,
    notas?: string
  },
  created_at?: string
}]
```

**4. `precios` (JSONB)**
```typescript
{
  mensual?: number | null,
  noche?: number | null,
  venta?: number | null
}
```

**5. `servicios` (JSONB[])**
```typescript
[{
  id: string,
  nombre: string,
  proveedor?: string,
  costo?: number,
  frecuencia?: string
}]
```

#### Índices Recomendados

```sql
CREATE INDEX idx_propiedades_owner ON propiedades(owner_id);
CREATE INDEX idx_propiedades_empresa ON propiedades(empresa_id);
CREATE INDEX idx_propiedades_estados ON propiedades USING GIN(estados);
CREATE INDEX idx_propiedades_draft ON propiedades(is_draft);
CREATE INDEX idx_propiedades_ubicacion ON propiedades USING GIN(ubicacion);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `PropertyFormData`

---

### TABLA: `profiles`

**Descripción:** Perfiles extendidos de usuarios (complementa auth.users de Supabase Auth).

#### Estructura de Campos

```sql
CREATE TABLE profiles (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ===== DATOS PERSONALES =====
  nombre          TEXT,
  apellido        TEXT,
  email           TEXT,
  telefono        TEXT,
  avatar_url      TEXT,

  -- ===== ORGANIZACIÓN =====
  empresa_id      UUID NULL,
  rol             TEXT, -- 'owner' | 'admin' | 'supervisor' | 'viewer'

  -- ===== PREFERENCIAS =====
  configuracion   JSONB, -- Preferencias de usuario

  -- ===== METADATA =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Relaciones

- `id` → `auth.users(id)` (1:1)
- `profiles.id` ← `propiedades.owner_id` (1:N)
- `profiles.id` ← `propiedades_colaboradores.user_id` (1:N)

#### Contrato TypeScript

```typescript
interface Profile {
  id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  avatar_url?: string;
  empresa_id?: string | null;
  rol?: 'owner' | 'admin' | 'supervisor' | 'viewer';
  configuracion?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
```

---

### TABLA: `property_images`

**Descripción:** Galería de fotos de propiedades con compresión dual (thumbnail + display).

#### Estructura de Campos

```sql
CREATE TABLE property_images (
  -- ===== IDENTIFICACIÓN =====
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== URLs =====
  url               TEXT NOT NULL, -- URL original/display
  url_thumbnail     TEXT, -- URL thumbnail (300x300)

  -- ===== METADATA =====
  is_cover          BOOLEAN DEFAULT FALSE,
  order_index       INTEGER DEFAULT 0,
  space_type        TEXT NULL, -- 'Habitación', 'Cocina', etc.
  caption           TEXT,

  -- ===== DIMENSIONES Y TAMAÑOS =====
  file_size         JSONB, -- {thumbnail: bytes, display: bytes}
  dimensions        JSONB, -- {thumbnail: {width, height}, display: {width, height}}

  -- ===== TIMESTAMPS =====
  uploaded_at       TIMESTAMPTZ DEFAULT NOW()
);
```

#### Campos JSON

**`file_size` (JSONB)**
```typescript
{
  thumbnail: number, // bytes
  display: number    // bytes
}
```

**`dimensions` (JSONB)**
```typescript
{
  thumbnail: { width: number, height: number },
  display: { width: number, height: number }
}
```

#### Índices

```sql
CREATE INDEX idx_property_images_property ON property_images(property_id);
CREATE INDEX idx_property_images_cover ON property_images(is_cover);
CREATE INDEX idx_property_images_order ON property_images(order_index);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `PropertyImage`

---

### TABLA: `servicios_inmueble`

**Descripción:** Servicios contratados para cada inmueble (luz, agua, internet, etc.).

#### Estructura de Campos

```sql
CREATE TABLE servicios_inmueble (
  -- ===== IDENTIFICACIÓN =====
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id        UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL SERVICIO =====
  tipo_servicio       TEXT NOT NULL, -- 'Luz', 'Agua', 'Gas', 'Internet', etc.
  nombre              TEXT NOT NULL,
  numero_contrato     TEXT,
  proveedor           TEXT,
  responsable         TEXT,

  -- ===== COSTO =====
  monto               NUMERIC(10,2) NOT NULL,
  es_fijo             BOOLEAN DEFAULT TRUE, -- true: fijo, false: variable

  -- ===== FRECUENCIA DE PAGO =====
  frecuencia_valor    INTEGER NOT NULL, -- 1, 2, 3, etc.
  frecuencia_unidad   TEXT NOT NULL, -- 'dias' | 'semanas' | 'meses' | 'anos'
  ultima_fecha_pago   DATE,

  -- ===== ESTADO =====
  activo              BOOLEAN DEFAULT TRUE,

  -- ===== TIMESTAMPS =====
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_servicios_propiedad ON servicios_inmueble(propiedad_id);
CREATE INDEX idx_servicios_activo ON servicios_inmueble(activo);
CREATE INDEX idx_servicios_tipo ON servicios_inmueble(tipo_servicio);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `ServicioInmueble`

---

### TABLA: `fechas_pago_servicios`

**Descripción:** Calendario de pagos programados para servicios.

#### Estructura de Campos

```sql
CREATE TABLE fechas_pago_servicios (
  -- ===== IDENTIFICACIÓN =====
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id       UUID REFERENCES servicios_inmueble(id) ON DELETE CASCADE,
  propiedad_id      UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== FECHA Y MONTO =====
  fecha_pago        DATE NOT NULL,
  monto_estimado    NUMERIC(10,2) NOT NULL,

  -- ===== ESTADO DE PAGO =====
  pagado            BOOLEAN DEFAULT FALSE,
  fecha_pago_real   DATE,
  monto_real        NUMERIC(10,2),

  -- ===== NOTAS =====
  notas             TEXT,

  -- ===== TIMESTAMPS =====
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_fechas_pago_servicio ON fechas_pago_servicios(servicio_id);
CREATE INDEX idx_fechas_pago_propiedad ON fechas_pago_servicios(propiedad_id);
CREATE INDEX idx_fechas_pago_fecha ON fechas_pago_servicios(fecha_pago);
CREATE INDEX idx_fechas_pago_pagado ON fechas_pago_servicios(pagado);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `FechaPagoServicio`

---

### TABLA: `tickets`

**Descripción:** Sistema de tareas y tickets pendientes para propiedades.

#### Estructura de Campos

```sql
CREATE TABLE tickets (
  -- ===== IDENTIFICACIÓN =====
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id        UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL TICKET =====
  titulo              TEXT NOT NULL,
  descripcion         TEXT,
  tipo                TEXT, -- 'Mantenimiento', 'Pago', 'Reparación', etc.
  prioridad           TEXT, -- 'Baja', 'Media', 'Alta', 'Urgente'

  -- ===== ASIGNACIÓN =====
  asignado_a          UUID REFERENCES profiles(id),
  creado_por          UUID REFERENCES profiles(id),

  -- ===== FECHAS =====
  fecha_programada    DATE,
  fecha_completado    DATE,

  -- ===== ESTADO =====
  estado              TEXT DEFAULT 'pendiente', -- 'pendiente' | 'en_progreso' | 'completado' | 'cancelado'
  pagado              BOOLEAN DEFAULT FALSE,

  -- ===== MONTO =====
  monto_estimado      NUMERIC(10,2),
  monto_real          NUMERIC(10,2),

  -- ===== TIMESTAMPS =====
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_tickets_propiedad ON tickets(propiedad_id);
CREATE INDEX idx_tickets_asignado ON tickets(asignado_a);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_fecha ON tickets(fecha_programada);
CREATE INDEX idx_tickets_pagado ON tickets(pagado);
```

#### Contrato TypeScript

```typescript
interface Ticket {
  id: string;
  propiedad_id: string;
  titulo: string;
  descripcion?: string;
  tipo?: string;
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  asignado_a?: string;
  creado_por?: string;
  fecha_programada?: string;
  fecha_completado?: string;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';
  pagado: boolean;
  monto_estimado?: number;
  monto_real?: number;
  created_at?: string;
  updated_at?: string;
}
```

---

### TABLA: `propiedades_colaboradores`

**Descripción:** Relación N:N entre propiedades y colaboradores (usuarios que pueden ver/editar propiedades).

#### Estructura de Campos

```sql
CREATE TABLE propiedades_colaboradores (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- ===== PERMISOS =====
  rol             TEXT DEFAULT 'viewer', -- 'viewer' | 'editor' | 'admin'

  -- ===== TIMESTAMPS =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- ===== CONSTRAINT =====
  UNIQUE(propiedad_id, user_id)
);
```

#### Índices

```sql
CREATE INDEX idx_colaboradores_propiedad ON propiedades_colaboradores(propiedad_id);
CREATE INDEX idx_colaboradores_user ON propiedades_colaboradores(user_id);
```

#### Contrato TypeScript

```typescript
interface PropiedadColaborador {
  id: string;
  propiedad_id: string;
  user_id: string;
  rol: 'viewer' | 'editor' | 'admin';
  created_at?: string;
}
```

---

### TABLA: `contactos`

**Descripción:** Directorio de contactos (inquilinos, proveedores, propietarios, etc.).

#### Estructura de Campos

```sql
CREATE TABLE contactos (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- ===== DATOS PERSONALES =====
  nombre          TEXT NOT NULL,
  apellido        TEXT,
  email           TEXT,
  telefono        TEXT,

  -- ===== TIPO =====
  tipo            TEXT, -- 'Inquilino', 'Propietario', 'Proveedor', etc.

  -- ===== EMPRESA (si aplica) =====
  empresa         TEXT,
  puesto          TEXT,

  -- ===== NOTAS =====
  notas           TEXT,

  -- ===== ESTADO =====
  activo          BOOLEAN DEFAULT TRUE,

  -- ===== TIMESTAMPS =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_contactos_user ON contactos(user_id);
CREATE INDEX idx_contactos_tipo ON contactos(tipo);
CREATE INDEX idx_contactos_activo ON contactos(activo);
```

---

### TABLA: `documentos`

**Descripción:** Almacenamiento de documentos adjuntos (tickets, pagos, contratos, etc.).

#### Estructura de Campos

```sql
CREATE TABLE documentos (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ===== RELACIONES =====
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  ticket_id       UUID REFERENCES tickets(id) ON DELETE CASCADE,
  pago_id         UUID REFERENCES fechas_pago_servicios(id) ON DELETE CASCADE,

  -- ===== DATOS DEL ARCHIVO =====
  nombre          TEXT NOT NULL,
  url             TEXT NOT NULL,
  tipo            TEXT, -- 'PDF', 'Imagen', 'Contrato', etc.
  tamano          INTEGER, -- bytes

  -- ===== METADATA =====
  descripcion     TEXT,

  -- ===== TIMESTAMPS =====
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_documentos_propiedad ON documentos(propiedad_id);
CREATE INDEX idx_documentos_ticket ON documentos(ticket_id);
CREATE INDEX idx_documentos_pago ON documentos(pago_id);
```

---

## 🔮 TABLAS PENDIENTES DE CREAR

### Fase 4.2: Calendario

#### TABLA: `eventos_calendario`

**Descripción:** Eventos y fechas importantes de propiedades.

```sql
CREATE TABLE eventos_calendario (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL EVENTO =====
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  tipo            TEXT, -- 'Contrato', 'Vencimiento', 'Inspección', 'Mantenimiento', etc.

  -- ===== FECHAS =====
  fecha_inicio    TIMESTAMPTZ NOT NULL,
  fecha_fin       TIMESTAMPTZ,
  todo_el_dia     BOOLEAN DEFAULT FALSE,

  -- ===== RECORDATORIOS =====
  recordatorio    JSONB, -- {cantidad: number, unidad: 'minutos'|'horas'|'dias'}

  -- ===== METADATA =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrato TypeScript:**

```typescript
interface EventoCalendario {
  id: string;
  propiedad_id: string;
  titulo: string;
  descripcion?: string;
  tipo?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  todo_el_dia: boolean;
  recordatorio?: {
    cantidad: number;
    unidad: 'minutos' | 'horas' | 'dias';
  };
  created_at?: string;
  updated_at?: string;
}
```

---

### Fase 4.4: Inventario

#### TABLA: `inventarios`

**Descripción:** Inventario de objetos detectados por IA en fotos.

```sql
CREATE TABLE inventarios (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL OBJETO =====
  nombre          TEXT NOT NULL,
  categoria       TEXT, -- 'Mueble', 'Electrodoméstico', 'Decoración', etc.
  descripcion     TEXT,

  -- ===== UBICACIÓN =====
  espacio         TEXT, -- 'Habitación principal', 'Cocina', etc.

  -- ===== CONDICIÓN =====
  estado          TEXT, -- 'Excelente', 'Bueno', 'Regular', 'Malo'

  -- ===== VALOR =====
  valor_estimado  NUMERIC(10,2),

  -- ===== FOTO =====
  foto_url        TEXT,

  -- ===== DATOS DE IA =====
  detectado_por_ia BOOLEAN DEFAULT FALSE,
  confidence_score NUMERIC(5,2), -- 0.00 - 1.00

  -- ===== TIMESTAMPS =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrato TypeScript:**

```typescript
interface Inventario {
  id: string;
  propiedad_id: string;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  espacio?: string;
  estado?: 'Excelente' | 'Bueno' | 'Regular' | 'Malo';
  valor_estimado?: number;
  foto_url?: string;
  detectado_por_ia: boolean;
  confidence_score?: number;
  created_at?: string;
  updated_at?: string;
}
```

---

### Fase 4.7: Balance / Transacciones

#### TABLA: `transacciones`

**Descripción:** Registro de ingresos y egresos de propiedades.

```sql
CREATE TABLE transacciones (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== TIPO DE TRANSACCIÓN =====
  tipo            TEXT NOT NULL, -- 'ingreso' | 'egreso'
  categoria       TEXT NOT NULL, -- 'Renta', 'Mantenimiento', 'Servicio', 'Reparación', etc.

  -- ===== DATOS FINANCIEROS =====
  monto           NUMERIC(10,2) NOT NULL,
  moneda          TEXT DEFAULT 'MXN',

  -- ===== DESCRIPCIÓN =====
  concepto        TEXT NOT NULL,
  descripcion     TEXT,

  -- ===== FECHA =====
  fecha           DATE NOT NULL,

  -- ===== RELACIONES =====
  servicio_id     UUID REFERENCES servicios_inmueble(id),
  ticket_id       UUID REFERENCES tickets(id),
  pago_id         UUID REFERENCES fechas_pago_servicios(id),

  -- ===== COMPROBANTE =====
  comprobante_url TEXT,

  -- ===== METADATA =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrato TypeScript:**

```typescript
interface Transaccion {
  id: string;
  propiedad_id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  monto: number;
  moneda: string;
  concepto: string;
  descripcion?: string;
  fecha: string;
  servicio_id?: string;
  ticket_id?: string;
  pago_id?: string;
  comprobante_url?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

## 👁️ VISTAS SQL

### Vista: `v_proximos_pagos`

**Descripción:** Vista materializada con próximos pagos de servicios.

```sql
CREATE VIEW v_proximos_pagos AS
SELECT
  fps.id,
  fps.servicio_id,
  fps.propiedad_id,
  fps.fecha_pago,
  fps.monto_estimado,
  fps.pagado,
  s.nombre AS servicio_nombre,
  s.tipo_servicio,
  s.proveedor,
  p.nombre_propiedad,
  p.owner_id,
  CASE
    WHEN fps.fecha_pago < CURRENT_DATE AND fps.pagado = FALSE THEN 'vencido'
    WHEN fps.fecha_pago = CURRENT_DATE AND fps.pagado = FALSE THEN 'hoy'
    WHEN fps.fecha_pago > CURRENT_DATE AND fps.pagado = FALSE THEN 'proximo'
    ELSE 'pagado'
  END AS estado
FROM fechas_pago_servicios fps
JOIN servicios_inmueble s ON fps.servicio_id = s.id
JOIN propiedades p ON fps.propiedad_id = p.id
WHERE fps.pagado = FALSE OR fps.fecha_pago >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY fps.fecha_pago ASC;
```

---

## 📝 CONTRATOS DE DATOS (TypeScript)

### Transformaciones FormData ↔ Database

#### 1. Transformación: Form → Database

```typescript
// Ver: /app/dashboard/catalogo/nueva/hooks/usePropertyDatabase.ts
function transformFormToDatabase(formData: PropertyFormData): DatabaseProperty {
  return {
    // Step 1
    nombre_propiedad: formData.nombre_propiedad,
    tipo_propiedad: formData.tipo_propiedad,
    mobiliario: formData.mobiliario,
    dimensiones: {
      terreno: {
        valor: parseFloat(formData.tamano_terreno || '0'),
        unidad: formData.tamano_terreno_unit || 'm²'
      },
      construccion: {
        valor: parseFloat(formData.tamano_construccion || '0'),
        unidad: formData.tamano_construccion_unit || 'm²'
      }
    },
    estados: formData.estados,
    propietarios_email: formData.propietarios_email,
    supervisores_email: formData.supervisores_email,

    // Step 2
    ubicacion: formData.ubicacion,

    // Step 3
    espacios: formData.espacios,

    // Step 4
    precios: formData.precios,
    inquilinos_email: formData.inquilinos_email,
    fecha_inicio_contrato: formData.fecha_inicio_contrato,
    duracion_contrato_valor: parseInt(formData.duracion_contrato_valor),
    duracion_contrato_unidad: formData.duracion_contrato_unidad,
    frecuencia_pago: formData.frecuencia_pago,
    dia_pago: parseInt(formData.dia_pago),
    precio_renta_disponible: parseFloat(formData.precio_renta_disponible),
    requisitos_renta: formData.requisitos_renta,
    requisitos_renta_custom: formData.requisitos_renta_custom,
    amenidades_vacacional: formData.amenidades_vacacional,

    // Step 5
    servicios: formData.servicios,

    // Metadata
    wizard_step: formData.wizard_step,
    wizard_completed: formData.wizard_completed,
    is_draft: formData.is_draft,
    updated_at: new Date().toISOString()
  };
}
```

#### 2. Transformación: Database → Form

```typescript
// Ver: /app/dashboard/catalogo/nueva/hooks/usePropertyDatabase.ts
function transformDatabaseToForm(dbData: DatabaseProperty): PropertyFormData {
  return {
    // Step 1
    nombre_propiedad: dbData.nombre_propiedad || '',
    tipo_propiedad: dbData.tipo_propiedad || 'Departamento',
    mobiliario: dbData.mobiliario || 'Amueblada',
    tamano_terreno: dbData.dimensiones?.terreno?.valor?.toString() || '',
    tamano_terreno_unit: dbData.dimensiones?.terreno?.unidad || 'm²',
    tamano_construccion: dbData.dimensiones?.construccion?.valor?.toString() || '',
    tamano_construccion_unit: dbData.dimensiones?.construccion?.unidad || 'm²',
    estados: dbData.estados || [],
    propietarios_email: dbData.propietarios_email || [],
    supervisores_email: dbData.supervisores_email || [],

    // Step 2
    ubicacion: dbData.ubicacion || INITIAL_UBICACION,

    // Step 3
    espacios: dbData.espacios || [],

    // Step 4
    precios: dbData.precios || { mensual: null, noche: null, venta: null },
    inquilinos_email: dbData.inquilinos_email || [],
    fecha_inicio_contrato: dbData.fecha_inicio_contrato || '',
    duracion_contrato_valor: dbData.duracion_contrato_valor?.toString() || '',
    duracion_contrato_unidad: dbData.duracion_contrato_unidad || 'meses',
    frecuencia_pago: dbData.frecuencia_pago || 'mensual',
    dia_pago: dbData.dia_pago?.toString() || '',
    precio_renta_disponible: dbData.precio_renta_disponible?.toString() || '',
    requisitos_renta: dbData.requisitos_renta || [],
    requisitos_renta_custom: dbData.requisitos_renta_custom || [],
    amenidades_vacacional: dbData.amenidades_vacacional || [],

    // Step 5
    servicios: dbData.servicios || [],

    // Step 6
    fotos: [], // Las fotos vienen de property_images

    // Metadata
    wizard_step: dbData.wizard_step || 1,
    wizard_completed: dbData.wizard_completed || false,
    is_draft: dbData.is_draft !== false,
    created_at: dbData.created_at,
    updated_at: dbData.updated_at,
    published_at: dbData.published_at
  };
}
```

---

## 🔄 FLUJO DE DATOS

### 1. Wizard de Nueva Propiedad → Supabase

```
┌──────────────────────┐
│ WizardContainer.tsx  │
│ (Form State)         │
└──────────┬───────────┘
           │
           │ formData (PropertyFormData)
           ▼
┌──────────────────────┐
│ usePropertyDatabase  │
│ .saveProperty()      │
└──────────┬───────────┘
           │
           │ transformFormToDatabase()
           ▼
┌──────────────────────┐
│ Supabase Client      │
│ .from('propiedades') │
│ .insert() / .update()│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ PostgreSQL Database  │
│ propiedades table    │
└──────────────────────┘
```

### 2. Supabase → Catálogo de Propiedades

```
┌──────────────────────┐
│ PostgreSQL Database  │
│ propiedades table    │
└──────────┬───────────┘
           │
           │ SELECT * FROM propiedades
           ▼
┌──────────────────────┐
│ Supabase Client      │
│ .from('propiedades') │
│ .select()            │
└──────────┬───────────┘
           │
           │ raw database data
           ▼
┌──────────────────────┐
│ transformDatabaseTo  │
│ Form() (si necesario)│
└──────────┬───────────┘
           │
           │ PropertyFormData
           ▼
┌──────────────────────┐
│ catalogo/page.tsx    │
│ (Lista de propiedades)│
└──────────────────────┘
```

### 3. Dashboard Consolidado

```
┌────────────────┐
│ Dashboard      │
│ page.tsx       │
└───────┬────────┘
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
┌───────────────┐           ┌──────────────────┐
│ propiedades   │           │ fechas_pago_     │
│ (COUNT, SUM)  │           │ servicios        │
└───────────────┘           │ (próximos pagos) │
        │                   └──────────────────┘
        │                              │
        ▼                              ▼
┌───────────────────────────────────────────┐
│ Widgets consolidados:                     │
│ - Resumen de propiedades                  │
│ - Calendario de eventos                   │
│ - Tickets pendientes                      │
│ - Balance financiero                      │
└───────────────────────────────────────────┘
```

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Estado Actual

⚠️ **IMPORTANTE:** RLS está actualmente **DESACTIVADO** en todas las tablas para facilitar el desarrollo.

**ESTO DEBE SER CORREGIDO ANTES DE PRODUCCIÓN (Fase 7).**

### Políticas Recomendadas

#### 1. Tabla `propiedades`

```sql
-- Habilitar RLS
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Política: Usuario ve sus propiedades
CREATE POLICY "usuarios_ven_sus_propiedades"
ON propiedades FOR SELECT
USING (
  auth.uid() = owner_id
  OR
  id IN (
    SELECT propiedad_id
    FROM propiedades_colaboradores
    WHERE user_id = auth.uid()
  )
);

-- Política: Usuario inserta sus propiedades
CREATE POLICY "usuarios_insertan_sus_propiedades"
ON propiedades FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Política: Usuario actualiza sus propiedades
CREATE POLICY "usuarios_actualizan_sus_propiedades"
ON propiedades FOR UPDATE
USING (auth.uid() = owner_id);

-- Política: Usuario elimina sus propiedades
CREATE POLICY "usuarios_eliminan_sus_propiedades"
ON propiedades FOR DELETE
USING (auth.uid() = owner_id);
```

#### 2. Tabla `property_images`

```sql
-- Habilitar RLS
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Política: Usuario ve fotos de sus propiedades
CREATE POLICY "usuarios_ven_fotos_de_sus_propiedades"
ON property_images FOR SELECT
USING (
  property_id IN (
    SELECT id FROM propiedades
    WHERE owner_id = auth.uid()
    OR id IN (
      SELECT propiedad_id
      FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    )
  )
);

-- Política: Usuario gestiona fotos de sus propiedades
CREATE POLICY "usuarios_gestionan_fotos_de_sus_propiedades"
ON property_images FOR ALL
USING (
  property_id IN (
    SELECT id FROM propiedades
    WHERE owner_id = auth.uid()
  )
);
```

#### 3. Otras Tablas

Aplicar políticas similares a:
- `servicios_inmueble`
- `fechas_pago_servicios`
- `tickets`
- `propiedades_colaboradores`
- `documentos`

---

## 🚀 ÍNDICES Y OPTIMIZACIONES

### Índices Existentes

Ver secciones de cada tabla arriba.

### Índices Recomendados para Optimización

```sql
-- Búsquedas por ubicación
CREATE INDEX idx_propiedades_ubicacion_ciudad
ON propiedades((ubicacion->>'ciudad'));

CREATE INDEX idx_propiedades_ubicacion_estado
ON propiedades((ubicacion->>'estado'));

-- Búsquedas por tipo
CREATE INDEX idx_propiedades_tipo
ON propiedades(tipo_propiedad);

-- Ordenamiento por fecha
CREATE INDEX idx_propiedades_created
ON propiedades(created_at DESC);

-- Filtros de precio (JSONB)
CREATE INDEX idx_propiedades_precio_mensual
ON propiedades(((precios->>'mensual')::numeric));

CREATE INDEX idx_propiedades_precio_venta
ON propiedades(((precios->>'venta')::numeric));

-- Full-text search (futuro)
CREATE INDEX idx_propiedades_nombre_fts
ON propiedades USING gin(to_tsvector('spanish', nombre_propiedad));
```

---

## 📌 NOTAS TÉCNICAS

### 1. Campos JSONB vs Columnas Separadas

**Se usa JSONB cuando:**
- Los datos están agrupados conceptualmente (ej: `ubicacion`, `dimensiones`)
- Se reduce la cantidad de columnas (mejor UX en Supabase)
- Los datos son opcionales o condicionales

**Se usan columnas separadas cuando:**
- Se necesita indexación específica
- Se hacen queries frecuentes por ese campo
- El campo es crítico para relaciones

### 2. Arrays de Texto vs Tablas de Relación

**Se usan arrays (`TEXT[]`) cuando:**
- Es una lista simple sin metadata adicional (ej: `estados`, `amenidades_vacacional`)
- No se necesita normalización estricta
- Se facilita la lectura en UI

**Se usan tablas de relación cuando:**
- Se necesita metadata adicional (ej: `propiedades_colaboradores` con `rol`)
- Se requieren queries complejas
- Hay relaciones N:N

### 3. Timestamps y Auditoría

Todas las tablas principales incluyen:
- `created_at`: Fecha de creación (automático)
- `updated_at`: Fecha de última actualización (manual via trigger o aplicación)

### 4. UUIDs vs Integer IDs

Se usa UUID v4 para:
- Seguridad (IDs no predecibles)
- Sincronización entre ambientes
- Estándar de Supabase Auth

### 5. Soft Delete vs Hard Delete

**Actualmente:** Hard delete (ON DELETE CASCADE)

**Recomendación futura:** Implementar soft delete con columna `deleted_at` para:
- Auditoría
- Recuperación de datos
- Historial

---

## 🎯 PRÓXIMOS PASOS

### Fase 4: Conectar Páginas de Catálogo

1. **Crear tablas pendientes:**
   - `eventos_calendario`
   - `inventarios`
   - `transacciones`

2. **Implementar interfaces TypeScript** para las nuevas tablas

3. **Crear helpers de transformación** para cada tipo de dato

4. **Documentar flujos de datos** específicos de cada página

### Fase 7: RLS & Seguridad

1. **Habilitar RLS** en todas las tablas
2. **Implementar políticas** de seguridad
3. **Testing exhaustivo** de permisos
4. **Auditoría de seguridad** completa

---

## 📚 REFERENCIAS

### Archivos Relacionados

- `/types/property.ts` - Interfaces TypeScript principales
- `/app/dashboard/catalogo/nueva/hooks/usePropertyDatabase.ts` - Hook de BD
- `/lib/supabase/client.ts` - Cliente de Supabase
- `/lib/supabase/supabase-storage.ts` - Gestión de Storage
- `.claude/PROJECT_PLAN.md` - Plan maestro del proyecto

### Documentación Externa

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**FIN DEL DOCUMENTO**

**Versión:** 1.0.0
**Última actualización:** 17 de Noviembre 2025
**Mantenido por:** Claude Code

*Este documento debe actualizarse cada vez que se modifique la estructura de la base de datos.*
