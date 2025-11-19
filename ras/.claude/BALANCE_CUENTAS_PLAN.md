# 💰 Plan de Implementación: Sistema de Cuentas Bancarias para Balance

**Fecha:** 19 Nov 2025
**Branch:** `claude/balance-accounts-feature-01WC67LYBKQDJuNUPxgyh11N`
**Sesión:** Continuación desde commit f0a8748
**Estado:** 🟡 En progreso

---

## 📋 RESUMEN EJECUTIVO

### Objetivo
Implementar un sistema de cuentas bancarias/cash que permita a los usuarios gestionar múltiples cuentas asociadas a sus propiedades, con soporte para diferentes monedas y tipos de cuenta.

### Problema Actual
El sistema de "Balance" actual solo muestra ingresos y egresos agregados, sin permitir al usuario manejar diferentes cuentas (efectivo MXN, tarjeta USD, etc.) por propietario o propiedad.

### Solución Propuesta
Crear una tabla `cuentas` que permita:
- Múltiples cuentas por usuario/propietario
- Asociación a una o varias propiedades
- Soporte para diferentes monedas (MXN, USD, EUR)
- Tipos de cuenta: Bancaria o Cash (Efectivo)
- Saldo inicial y fechas de corte para estados de cuenta

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Nueva Tabla: `cuentas`

```sql
CREATE TABLE cuentas (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información básica
  nombre_cuenta VARCHAR(255) NOT NULL, -- ej: "Cuenta Efectivo MXN - Casa Playa"
  descripcion TEXT,

  -- Configuración financiera
  saldo_inicial DECIMAL(12, 2) DEFAULT 0.00,
  saldo_actual DECIMAL(12, 2) DEFAULT 0.00, -- Se actualiza con movimientos
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN', -- MXN, USD, EUR
  tipo_cuenta VARCHAR(20) NOT NULL, -- 'bancaria' | 'efectivo'

  -- Información bancaria (opcional, solo para cuentas bancarias)
  banco VARCHAR(255),
  numero_cuenta VARCHAR(100),
  clabe VARCHAR(18),

  -- Asociaciones
  propietarios_ids UUID[], -- Array de UUIDs de propietarios
  propiedades_ids UUID[], -- Array de UUIDs de propiedades

  -- Configuración de reportes
  fecha_corte_dia INTEGER DEFAULT 1, -- Día del mes para corte (1-31)
  genera_estados_cuenta BOOLEAN DEFAULT false,

  -- Estado
  activa BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_moneda CHECK (moneda IN ('MXN', 'USD', 'EUR')),
  CONSTRAINT check_tipo_cuenta CHECK (tipo_cuenta IN ('bancaria', 'efectivo')),
  CONSTRAINT check_fecha_corte CHECK (fecha_corte_dia >= 1 AND fecha_corte_dia <= 31)
);

-- Índices para optimización
CREATE INDEX idx_cuentas_user_id ON cuentas(user_id);
CREATE INDEX idx_cuentas_activa ON cuentas(activa);
CREATE INDEX idx_cuentas_tipo ON cuentas(tipo_cuenta);
CREATE INDEX idx_cuentas_moneda ON cuentas(moneda);

-- Índice GIN para búsqueda en arrays
CREATE INDEX idx_cuentas_propiedades ON cuentas USING GIN(propiedades_ids);
CREATE INDEX idx_cuentas_propietarios ON cuentas USING GIN(propietarios_ids);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cuentas_updated_at
BEFORE UPDATE ON cuentas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Tabla Relacionada: `movimientos_cuenta` (Futuro)

Esta tabla se implementará posteriormente para registrar todos los movimientos (ingresos/egresos) asociados a cada cuenta:

```sql
CREATE TABLE movimientos_cuenta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuenta_id UUID NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL, -- 'ingreso' | 'egreso'
  monto DECIMAL(12, 2) NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  fecha_movimiento DATE NOT NULL,
  responsable VARCHAR(255),
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_tipo_movimiento CHECK (tipo IN ('ingreso', 'egreso')),
  CONSTRAINT check_monto_positivo CHECK (monto >= 0)
);

CREATE INDEX idx_movimientos_cuenta_id ON movimientos_cuenta(cuenta_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_cuenta(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos_cuenta(fecha_movimiento);
```

---

## 🎨 INTERFACES TYPESCRIPT

### `types/cuenta.ts`

```typescript
export type TipoCuenta = 'bancaria' | 'efectivo'
export type Moneda = 'MXN' | 'USD' | 'EUR'

export interface Cuenta {
  // Identificadores
  id: string
  user_id: string

  // Información básica
  nombre_cuenta: string
  descripcion?: string

  // Configuración financiera
  saldo_inicial: number
  saldo_actual: number
  moneda: Moneda
  tipo_cuenta: TipoCuenta

  // Información bancaria (opcional)
  banco?: string
  numero_cuenta?: string
  clabe?: string

  // Asociaciones
  propietarios_ids: string[] // UUIDs de propietarios
  propiedades_ids: string[] // UUIDs de propiedades

  // Configuración de reportes
  fecha_corte_dia: number
  genera_estados_cuenta: boolean

  // Estado
  activa: boolean

  // Metadata
  created_at: string
  updated_at: string
}

export interface CuentaFormData {
  nombre_cuenta: string
  descripcion?: string
  saldo_inicial: number
  moneda: Moneda
  tipo_cuenta: TipoCuenta

  // Info bancaria (solo si tipo_cuenta === 'bancaria')
  banco?: string
  numero_cuenta?: string
  clabe?: string

  // Asociaciones
  propietarios_ids: string[]
  propiedades_ids: string[]

  // Config
  fecha_corte_dia: number
  genera_estados_cuenta: boolean
}

export interface MovimientoCuenta {
  id: string
  cuenta_id: string
  tipo: 'ingreso' | 'egreso'
  monto: number
  concepto: string
  categoria?: string
  fecha_movimiento: string
  responsable?: string
  comprobante_url?: string
  notas?: string
  created_at: string
}
```

---

## 🧩 COMPONENTES A CREAR/MODIFICAR

### 1. **Nuevo Modal:** `AñadirCuentaModal.tsx`

**Ubicación:** `/components/AñadirCuentaModal.tsx`

**Funcionalidad:**
- Formulario con validación para crear/editar cuentas
- Pasos o secciones:
  1. Información Básica (nombre, tipo, moneda, saldo inicial)
  2. Información Bancaria (solo si tipo === 'bancaria')
  3. Asociaciones (propietarios, propiedades)
  4. Configuración (fecha de corte, estados de cuenta)

**Props:**
```typescript
interface AñadirCuentaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (cuenta: Cuenta) => void
  cuentaId?: string // Para edición
  propiedadIdPrecargada?: string // Si se abre desde una propiedad específica
}
```

**Características:**
- Validación con Zod
- Multi-select para propiedades y propietarios
- Toggle para tipo de cuenta (bancaria/efectivo)
- Selector de moneda (MXN, USD, EUR)
- Input numérico para saldo inicial
- Selector de día de corte (1-31)

---

### 2. **Modificar:** `TopBar.tsx` en Catálogo

**Archivo:** `/app/dashboard/catalogo/page.tsx`

**Cambios:**
```typescript
// En el dropdown de TopBar, agregar nueva opción
dropdownItems={[
  {
    label: 'Agregar propiedad',
    icon: <PropertyIcon />,
    onClick: () => setShowWizard(true)
  },
  {
    label: 'Añadir cuenta', // NUEVO
    icon: <BankIcon />,      // NUEVO
    onClick: () => setShowAñadirCuenta(true) // NUEVO
  }
]}
```

**Estados necesarios:**
```typescript
const [showAñadirCuenta, setShowAñadirCuenta] = useState(false)
```

---

### 3. **Modificar:** Página Balance (`/dashboard/cuentas/page.tsx`)

**Cambios principales:**

1. **Cargar cuentas en lugar de movimientos directos:**
```typescript
const cargarCuentas = async (userId: string) => {
  const { data: cuentas } = await supabase
    .from('cuentas')
    .select('*')
    .eq('user_id', userId)
    .eq('activa', true)
    .order('created_at', { ascending: false })

  setCuentas(cuentas || [])
}
```

2. **Filtrar cuentas por propiedad:**
```typescript
// Si el usuario está viendo desde una propiedad específica
const cuentasFiltradas = cuentas.filter(cuenta =>
  cuenta.propiedades_ids.includes(propiedadIdActual)
)
```

3. **Mostrar tarjetas de cuentas:**
- Cada cuenta como una tarjeta con:
  - Nombre de la cuenta
  - Tipo (bancaria/efectivo) + Moneda
  - Saldo actual
  - Propiedades asociadas
  - Botón para ver detalles/movimientos
  - Botón para editar
  - Botón para desactivar

4. **Mostrar movimientos por cuenta:**
- Al seleccionar una cuenta, mostrar sus movimientos
- Mantener la tabla de movimientos actual pero filtrada por cuenta

---

### 4. **Modificar:** Dashboard (`/dashboard/page.tsx`)

**Cambios principales:**

1. **Renombrar "Cuentas" → "Balance":**
```typescript
<Card
  title="Balance" // Antes: "Cuentas"
  onClick={() => router.push('/dashboard/balance')} // Nueva ruta
  icon={<BalanceIcon />}
/>
```

2. **Agregar métricas de cuentas:**
```typescript
const cargarMetricasCuentas = async (userId: string) => {
  // Total de cuentas activas
  const { data: cuentas } = await supabase
    .from('cuentas')
    .select('id, moneda, saldo_actual')
    .eq('user_id', userId)
    .eq('activa', true)

  // Agrupar por moneda
  const balancePorMoneda = cuentas.reduce((acc, cuenta) => {
    if (!acc[cuenta.moneda]) acc[cuenta.moneda] = 0
    acc[cuenta.moneda] += cuenta.saldo_actual
    return acc
  }, {} as Record<Moneda, number>)

  return {
    totalCuentas: cuentas.length,
    balancePorMoneda
  }
}
```

3. **Mostrar en Dashboard:**
```typescript
{/* Balance - Mostrando totales por moneda */}
<div className="bg-white rounded-xl p-4 border-2 border-[#6b8e23]/20">
  <div className="text-xs font-semibold mb-2 text-[#6b8e23]">
    Balance Total
  </div>
  {Object.entries(metrics.balance.balancePorMoneda).map(([moneda, saldo]) => (
    <div key={moneda} className="flex justify-between items-center mb-1">
      <span className="text-sm text-gray-600">{moneda}:</span>
      <span className="text-lg font-bold text-[#6b8e23]">
        {formatearMonto(saldo, moneda)}
      </span>
    </div>
  ))}
  <div className="text-xs text-gray-500 mt-2">
    {metrics.balance.totalCuentas} cuenta{metrics.balance.totalCuentas !== 1 ? 's' : ''}
  </div>
</div>
```

---

### 5. **Nueva Página (Opcional):** `/dashboard/balance/page.tsx`

**Funcionalidad:**
- Vista consolidada de TODAS las cuentas del usuario
- Filtros por:
  - Propiedad
  - Tipo de cuenta
  - Moneda
  - Estado (activa/inactiva)
- Tarjetas de resumen por moneda
- Tabla o grid de cuentas
- Botón para añadir nueva cuenta

**Diferencia con `/dashboard/cuentas`:**
- `/dashboard/cuentas`: Movimientos de ingresos/egresos (histórico)
- `/dashboard/balance`: Gestión de cuentas bancarias/efectivo (cuentas activas)

---

## 🔄 FLUJO DE USUARIO

### Escenario 1: Crear una cuenta desde el Catálogo

```
1. Usuario va a Catálogo
2. Click en botón "+"
3. Click en "Añadir cuenta"
4. Se abre AñadirCuentaModal
5. Usuario llena el formulario:
   - Nombre: "Cuenta Efectivo Casa Playa"
   - Tipo: Efectivo
   - Moneda: MXN
   - Saldo inicial: $50,000
   - Propiedades: Selecciona "Casa Playa"
   - Propietarios: Selecciona propietario
   - Fecha de corte: 1 (cada 1 del mes)
6. Click en "Guardar"
7. Sistema crea cuenta en Supabase
8. Toast de éxito
9. Modal se cierra
10. Usuario puede ver la cuenta en Balance
```

### Escenario 2: Ver cuentas en Balance por propiedad

```
1. Usuario va a Catálogo
2. Click en botón "Balance" de una propiedad
3. Sistema muestra página /dashboard/propiedad/[id]/cuentas
4. Se muestran solo las cuentas asociadas a esa propiedad
5. Usuario puede ver saldo, tipo, moneda de cada cuenta
6. Usuario puede agregar movimientos a cada cuenta
```

### Escenario 3: Ver todas las cuentas en Dashboard

```
1. Usuario va a Dashboard
2. Click en card "Balance"
3. Sistema muestra /dashboard/balance
4. Se muestran TODAS las cuentas del usuario
5. Filtros disponibles:
   - Por propiedad
   - Por tipo (bancaria/efectivo)
   - Por moneda
6. Resumen de saldos por moneda
7. Usuario puede crear, editar, desactivar cuentas
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base de Datos
- [ ] Crear tabla `cuentas` en Supabase
- [ ] Crear índices necesarios
- [ ] Crear trigger para `updated_at`
- [ ] Configurar RLS (Row Level Security) - TEMPORAL: Desactivado
- [ ] Probar inserciones manualmente

### Fase 2: Tipos TypeScript
- [ ] Crear `/types/cuenta.ts`
- [ ] Definir interfaces: `Cuenta`, `CuentaFormData`
- [ ] Exportar tipos en `/types/index.ts`

### Fase 3: Modal de Añadir Cuenta
- [ ] Crear componente `AñadirCuentaModal.tsx`
- [ ] Implementar formulario con validación
- [ ] Multi-select para propiedades
- [ ] Multi-select para propietarios (futuro)
- [ ] Toggle tipo cuenta (bancaria/efectivo)
- [ ] Selector de moneda
- [ ] Condicional: mostrar campos bancarios solo si tipo === 'bancaria'
- [ ] Validación con Zod
- [ ] Integración con Supabase (crear/editar)
- [ ] Estados de loading/error
- [ ] Toast de éxito/error

### Fase 4: Integración en Catálogo
- [ ] Modificar `/app/dashboard/catalogo/page.tsx`
- [ ] Agregar estado `showAñadirCuenta`
- [ ] Agregar opción "Añadir cuenta" en dropdown del TopBar
- [ ] Renderizar `AñadirCuentaModal`
- [ ] Manejar callback de éxito

### Fase 5: Modificar Página Balance
- [ ] Modificar `/app/dashboard/cuentas/page.tsx`
- [ ] Cargar cuentas en lugar de movimientos directos
- [ ] Mostrar tarjetas de cuentas
- [ ] Filtrar cuentas por propiedad (si aplica)
- [ ] Mostrar detalles de cuenta seleccionada
- [ ] Botones de editar/desactivar cuenta
- [ ] Integración con movimientos (futuro)

### Fase 6: Actualizar Dashboard
- [ ] Modificar `/app/dashboard/page.tsx`
- [ ] Renombrar "Cuentas" → "Balance"
- [ ] Cargar métricas de cuentas
- [ ] Mostrar balance total por moneda
- [ ] Mostrar cantidad de cuentas activas
- [ ] Link a nueva página `/dashboard/balance` (opcional)

### Fase 7: Página Balance Global (Opcional)
- [ ] Crear `/app/dashboard/balance/page.tsx`
- [ ] Listar TODAS las cuentas del usuario
- [ ] Implementar filtros (propiedad, tipo, moneda)
- [ ] Tarjetas de resumen por moneda
- [ ] Grid/tabla de cuentas
- [ ] Botón para añadir cuenta
- [ ] Integración con AñadirCuentaModal

### Fase 8: Testing
- [ ] Probar creación de cuenta
- [ ] Probar edición de cuenta
- [ ] Probar desactivación de cuenta
- [ ] Probar filtros en Balance
- [ ] Probar asociación a múltiples propiedades
- [ ] Probar diferentes monedas
- [ ] Probar tipos de cuenta (bancaria/efectivo)
- [ ] Verificar responsividad
- [ ] Verificar validaciones

### Fase 9: Documentación
- [ ] Actualizar `PROJECT_PLAN.md`
- [ ] Crear `CUENTAS_MANUAL.md` (guía de usuario)
- [ ] Comentar código complejo
- [ ] Actualizar README si es necesario

### Fase 10: Commit y Push
- [ ] Commit con mensaje descriptivo
- [ ] Push al branch `claude/balance-accounts-feature-01WC67LYBKQDJuNUPxgyh11N`
- [ ] Crear PR (si aplica)

---

## 🎯 PRIORIDADES

### P0 - Crítico (Debe funcionar YA)
1. Tabla `cuentas` creada en Supabase
2. Modal `AñadirCuentaModal` funcional
3. Opción "Añadir cuenta" en Catálogo
4. Mostrar cuentas en Balance

### P1 - Alto (Importante pero no bloqueante)
5. Filtros en página Balance
6. Editar/desactivar cuentas
7. Dashboard mostrando balance por moneda

### P2 - Medio (Nice to have)
8. Página `/dashboard/balance` separada
9. Validaciones avanzadas
10. Animaciones y transiciones

### P3 - Bajo (Futuro)
11. Tabla `movimientos_cuenta`
12. Integración de movimientos con cuentas
13. Estados de cuenta automáticos
14. Exportación a PDF/Excel

---

## 🚨 CONSIDERACIONES IMPORTANTES

### 1. **Propietarios vs Usuarios**
- Actualmente el sistema tiene `owner_id` en propiedades
- No existe una tabla `propietarios` separada
- **Decisión:** Por ahora, `propietarios_ids` apuntará a `auth.users` (mismo que usuarios del sistema)
- **Futuro:** Crear tabla `propietarios` separada para propietarios que no son usuarios del sistema

### 2. **Saldo Actual vs Movimientos**
- `saldo_actual` se calculará automáticamente cuando se implemente `movimientos_cuenta`
- Por ahora, será igual a `saldo_inicial`
- **Futuro:** Trigger o función para actualizar `saldo_actual` en cada movimiento

### 3. **Múltiples Propiedades por Cuenta**
- Una cuenta puede estar asociada a varias propiedades
- Esto permite escenarios como: "Cuenta de efectivo compartida entre Casa Playa y Departamento Centro"
- Los filtros deben soportar esta relación muchos-a-muchos

### 4. **Monedas y Conversión**
- Por ahora, NO se implementará conversión automática de monedas
- Cada cuenta tiene su moneda fija
- El usuario debe manejar conversiones manualmente
- **Futuro:** Integración con API de tipos de cambio (opcional)

### 5. **RLS (Row Level Security)**
- Por ahora está DESACTIVADO para facilitar desarrollo
- Antes de producción, implementar política:
  ```sql
  -- Usuario solo ve sus propias cuentas
  CREATE POLICY cuentas_select_policy ON cuentas
  FOR SELECT USING (auth.uid() = user_id);

  -- Usuario solo puede crear sus propias cuentas
  CREATE POLICY cuentas_insert_policy ON cuentas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- Usuario solo puede actualizar sus propias cuentas
  CREATE POLICY cuentas_update_policy ON cuentas
  FOR UPDATE USING (auth.uid() = user_id);

  -- Usuario solo puede eliminar sus propias cuentas
  CREATE POLICY cuentas_delete_policy ON cuentas
  FOR DELETE USING (auth.uid() = user_id);
  ```

### 6. **Validaciones de Formulario**
```typescript
import { z } from 'zod'

export const cuentaSchema = z.object({
  nombre_cuenta: z.string().min(3, 'Mínimo 3 caracteres').max(255),
  descripcion: z.string().optional(),
  saldo_inicial: z.number().min(0, 'El saldo no puede ser negativo'),
  moneda: z.enum(['MXN', 'USD', 'EUR']),
  tipo_cuenta: z.enum(['bancaria', 'efectivo']),

  // Condicional: solo si tipo_cuenta === 'bancaria'
  banco: z.string().optional(),
  numero_cuenta: z.string().optional(),
  clabe: z.string().length(18, 'CLABE debe tener 18 dígitos').optional(),

  propietarios_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos un propietario'),
  propiedades_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos una propiedad'),

  fecha_corte_dia: z.number().min(1).max(31),
  genera_estados_cuenta: z.boolean()
}).refine(data => {
  // Si es cuenta bancaria, debe tener al menos el nombre del banco
  if (data.tipo_cuenta === 'bancaria') {
    return data.banco && data.banco.length > 0
  }
  return true
}, {
  message: 'Las cuentas bancarias deben tener un banco asociado',
  path: ['banco']
})
```

---

## 📊 ESTIMACIÓN DE TIEMPO

| Fase | Tiempo Estimado |
|------|----------------|
| Base de Datos | 30 min |
| Tipos TypeScript | 15 min |
| Modal Añadir Cuenta | 2 horas |
| Integración Catálogo | 30 min |
| Modificar Balance | 1.5 horas |
| Actualizar Dashboard | 1 hora |
| Página Balance Global | 1.5 horas (Opcional) |
| Testing | 1 hora |
| Documentación | 30 min |

**Total:** ~8-9 horas de trabajo

---

## 🔗 RELACIÓN CON PROJECT_PLAN.md

Esta funcionalidad es parte de:
- **Fase 4.7:** Balance (Ingresos/Egresos)
- Conecta con la estructura de propiedades existente
- Prepara el terreno para movimientos e ingresos/egresos

**Actualización en PROJECT_PLAN.md:**
```markdown
#### 4.7 Balance (Ingresos/Egresos)

**Estado:** 🟡 En progreso (50%)

- [x] Identificar necesidad de tabla de cuentas
- [x] Diseñar estructura de tabla `cuentas`
- [x] Crear plan de implementación
- [ ] Implementar tabla en Supabase
- [ ] Crear modal de añadir cuenta
- [ ] Integrar con catálogo
- [ ] Modificar página Balance
- [ ] Actualizar Dashboard
- [ ] Implementar movimientos (ingreso/egreso)
- [ ] Gráficas de resumen
- [ ] Exportar reportes
```

---

## ✅ CRITERIOS DE ACEPTACIÓN

### La funcionalidad estará completa cuando:

1. ✅ Un usuario puede crear una cuenta bancaria o de efectivo desde el catálogo
2. ✅ Las cuentas se pueden asociar a múltiples propiedades
3. ✅ Las cuentas soportan múltiples monedas (MXN, USD, EUR)
4. ✅ En la página Balance se muestran las cuentas filtradas por propiedad
5. ✅ En el Dashboard se muestra el balance total por moneda
6. ✅ El usuario puede editar y desactivar cuentas existentes
7. ✅ Las validaciones de formulario funcionan correctamente
8. ✅ La UI es consistente con el resto del sistema
9. ✅ No hay errores en consola
10. ✅ El código está documentado y es mantenible

---

## 📝 NOTAS ADICIONALES

### Ideas para Futuras Mejoras
- [ ] Importación masiva de cuentas (CSV)
- [ ] Gráficas de evolución de saldo por cuenta
- [ ] Alertas de saldo bajo
- [ ] Conciliación bancaria (comparar con estado de cuenta real)
- [ ] Proyecciones de flujo de efectivo
- [ ] Multi-moneda con conversión automática
- [ ] Exportación de estados de cuenta a PDF
- [ ] Integración con APIs bancarias (Open Banking)

### Preguntas para el Usuario
- ¿Se necesita tabla de propietarios separada de usuarios?
- ¿Se requiere conversión automática de monedas?
- ¿Los movimientos se registrarán manualmente o automáticamente?
- ¿Se necesita integración con sistemas externos (bancos, APIs)?

---

**Última actualización:** 19 Nov 2025
**Siguiente revisión:** Después de completar Fase 1-3 del checklist
