# 🔧 Cambios Manuales para Home Propiedad

## 📋 Orden de Ejecución

1. ✅ SQL Migration (en Supabase)
2. ✅ Cambios de código (en VS Code)
3. ✅ Verificar resultados

---

## 1️⃣ SQL MIGRATION (SUPABASE SQL EDITOR)

### PASO 1: Migrar los datos
```sql
UPDATE propiedades
SET precios = COALESCE(precios, '{}'::jsonb) ||
              jsonb_build_object('mensual', precio_renta_disponible)
WHERE precio_renta_disponible IS NOT NULL;
```

### PASO 2: Verificar que funcionó
```sql
SELECT id, nombre_propiedad, precio_renta_disponible,
       precios->>'mensual' as precio_nuevo_mensual, precios
FROM propiedades
WHERE precio_renta_disponible IS NOT NULL
LIMIT 10;
```

**¿Qué debes ver?** La columna `precio_nuevo_mensual` debe tener los mismos valores que `precio_renta_disponible`.

### PASO 3: Eliminar columna vieja (SOLO SI PASO 2 SE VE BIEN)
```sql
ALTER TABLE propiedades DROP COLUMN precio_renta_disponible;
```

---

## 2️⃣ CAMBIOS DE CÓDIGO

### Archivo: `/ras/app/dashboard/catalogo/propiedad/[id]/home/page.tsx`

---

### ✂️ CAMBIO 1: ELIMINAR Botones de Navegación

**ELIMINAR LÍNEAS 491-601**

Busca esta sección y elimínala COMPLETAMENTE:

```tsx
        {/* Navegación rápida */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={irATickets}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
```

...hasta...

```tsx
          </button>
        </div>
```

**BORRA TODO EL GRID DE 6 BOTONES** (Tickets, Galería, Calendario, Balance, Anuncio, Inventario)

---

### 🔄 CAMBIO 2: REEMPLAZAR "Datos Básicos" (Líneas 638-719)

**BUSCA:**
```tsx
            {/* Datos Básicos */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
```

**REEMPLAZA TODO EL BLOQUE (hasta el `</div>` que cierra "Datos Básicos") CON:**

```tsx
            {/* Datos Básicos */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Datos Básicos</h2>
              </div>

              <div className="space-y-2">
                {/* Mobiliario */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Mobiliario:</span>
                  <span className="text-gray-900 font-semibold">{propiedad.mobiliario}</span>
                </div>

                {/* ✅ Habitaciones y Baños en el MISMO renglón */}
                {propiedad.espacios && (
                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Habitaciones:</span>
                      <span className="text-gray-900 font-semibold">
                        {propiedad.espacios.filter(e => e.type === 'Habitación' || e.type === 'Lock-off').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Baños:</span>
                      <span className="text-gray-900 font-semibold">
                        {propiedad.espacios.filter(e => e.type === 'Baño completo' || e.type === 'Medio baño').length}
                      </span>
                    </div>
                  </div>
                )}

                {/* ✅ Terreno y Construcción en el MISMO renglón */}
                {(propiedad.dimensiones?.terreno?.valor || propiedad.dimensiones?.construccion?.valor) && (
                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-100">
                    {propiedad.dimensiones?.terreno?.valor && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Terreno:</span>
                        <span className="text-gray-900 font-semibold">
                          {propiedad.dimensiones.terreno.valor} {propiedad.dimensiones.terreno.unidad}
                        </span>
                      </div>
                    )}
                    {propiedad.dimensiones?.construccion?.valor && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Construcción:</span>
                        <span className="text-gray-900 font-semibold">
                          {propiedad.dimensiones.construccion.valor} {propiedad.dimensiones.construccion.unidad}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ PRECIOS - Ahora con más espacio y tamaño más grande */}
                {propiedad.precios?.mensual && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Renta mensual:</span>
                    <span className="text-green-600 font-bold text-lg">
                      ${propiedad.precios.mensual.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                )}

                {propiedad.precios?.noche && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Precio por noche:</span>
                    <span className="text-blue-600 font-bold text-lg">
                      ${propiedad.precios.noche.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                )}

                {propiedad.precios?.venta && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Precio de venta:</span>
                    <span className="text-purple-600 font-bold text-lg">
                      ${propiedad.precios.venta.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                )}
              </div>
            </div>
```

---

### 🔄 CAMBIO 3: REEMPLAZAR "Asignaciones" (Líneas 871-951)

**BUSCA:**
```tsx
            {/* Asignaciones */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
```

**REEMPLAZA TODO EL BLOQUE (hasta el `</div>` que cierra "Asignaciones") CON:**

```tsx
            {/* Asignaciones */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Asignaciones</h2>
              </div>

              <div className="space-y-4">
                {/* Propietarios */}
                {propiedad.propietarios_email && propiedad.propietarios_email.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-xs text-blue-600 font-semibold uppercase block mb-2">
                      Propietario{propiedad.propietarios_email.length > 1 ? 's' : ''}
                    </span>
                    <div className="space-y-1">
                      {propiedad.propietarios_email.map((email, idx) => (
                        <p key={idx} className="text-sm text-gray-900 font-medium">✉️ {email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supervisores */}
                {propiedad.supervisores_email && propiedad.supervisores_email.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-xs text-green-600 font-semibold uppercase block mb-2">
                      Supervisor{propiedad.supervisores_email.length > 1 ? 'es' : ''}
                    </span>
                    <div className="space-y-1">
                      {propiedad.supervisores_email.map((email, idx) => (
                        <p key={idx} className="text-sm text-gray-900 font-medium">✉️ {email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inquilinos */}
                {propiedad.inquilinos_email && propiedad.inquilinos_email.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-xs text-amber-600 font-semibold uppercase block mb-2">
                      Inquilino{propiedad.inquilinos_email.length > 1 ? 's' : ''}
                    </span>
                    <div className="space-y-1">
                      {propiedad.inquilinos_email.map((email, idx) => (
                        <p key={idx} className="text-sm text-gray-900 font-medium">✉️ {email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {(!propiedad.propietarios_email || propiedad.propietarios_email.length === 0) &&
                 (!propiedad.supervisores_email || propiedad.supervisores_email.length === 0) &&
                 (!propiedad.inquilinos_email || propiedad.inquilinos_email.length === 0) && (
                  <p className="text-gray-500 text-center py-8">No hay asignaciones registradas</p>
                )}
              </div>
            </div>
```

---

## ✅ CHECKLIST

- [ ] PASO 1: Ejecutar SQL migration (UPDATE)
- [ ] PASO 2: Verificar migration (SELECT)
- [ ] PASO 3: Eliminar columna vieja (DROP)
- [ ] CAMBIO 1: Eliminar botones de navegación (líneas 491-601)
- [ ] CAMBIO 2: Reemplazar "Datos Básicos" (líneas 638-719)
- [ ] CAMBIO 3: Reemplazar "Asignaciones" (líneas 871-951)
- [ ] VERIFICAR: Refrescar página y ver que todo funciona

---

## 🎯 Resultado Esperado

Después de estos cambios deberías ver:

1. ✅ **Sin botones de navegación** en la parte superior
2. ✅ **Precio de renta mensual** visible en "Datos Básicos"
3. ✅ **Habitaciones y Baños** en el mismo renglón
4. ✅ **Terreno y Construcción** en el mismo renglón
5. ✅ **Emails de contactos** directamente en "Asignaciones"

---

**Archivo generado automáticamente**
**Fecha: 2025-01-18**
