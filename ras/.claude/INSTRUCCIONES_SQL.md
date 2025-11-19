# 📝 Instrucciones para Ejecutar SQL en Supabase

## ✅ PASO 1: Acceder al Editor SQL de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral izquierdo, haz click en **"SQL Editor"**
3. Click en **"+ New query"** para crear una nueva consulta

## ✅ PASO 2: Ejecutar el Script de Creación de Tabla

1. Abre el archivo: `.claude/sql/001_create_cuentas_table.sql`
2. **Copia TODO el contenido del archivo**
3. Pega el contenido en el editor SQL de Supabase
4. Click en el botón **"Run"** (o presiona `Cmd/Ctrl + Enter`)

### ⚠️ Verificar que la ejecución fue exitosa

Deberías ver un mensaje como:
```
Success. No rows returned
```

O en algunos casos:
```
CREATE TABLE
CREATE INDEX
CREATE TRIGGER
...
```

### 🔍 Verificar que la tabla se creó correctamente

Ejecuta esta consulta para verificar:

```sql
-- Verificar que la tabla existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'cuentas';

-- Ver la estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cuentas'
ORDER BY ordinal_position;

-- Ver los índices creados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'cuentas';
```

Deberías ver:
- 1 tabla llamada `cuentas`
- Aproximadamente 20 columnas
- Al menos 7 índices

## ✅ PASO 3: Verificar RLS (Row Level Security)

Ejecuta:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'cuentas';
```

**Resultado esperado:**
- `rowsecurity = false` (por ahora, para desarrollo)

⚠️ **IMPORTANTE:** Antes de producción, debes habilitar RLS descomentando las políticas en el script SQL.

## ✅ PASO 4: Insertar Datos de Prueba (Opcional)

Si quieres probar con datos de ejemplo:

```sql
-- Reemplaza <USER_UUID> con tu ID de usuario real
-- Puedes obtenerlo ejecutando: SELECT id FROM auth.users LIMIT 1;

INSERT INTO cuentas (
  user_id,
  nombre_cuenta,
  descripcion,
  saldo_inicial,
  moneda,
  tipo_cuenta,
  propiedades_ids,
  fecha_corte_dia,
  genera_estados_cuenta
) VALUES (
  '<TU_USER_UUID>',
  'Cuenta de Prueba MXN',
  'Cuenta principal en pesos mexicanos para pruebas',
  100000.00,
  'MXN',
  'bancaria',
  ARRAY[]::UUID[], -- Sin propiedades por ahora
  1,
  false
) RETURNING *;
```

## ✅ PASO 5: Verificar que los Datos se Insertaron

```sql
SELECT * FROM cuentas;
```

Deberías ver tu cuenta de prueba listada con todos sus campos.

## ✅ PASO 6: Probar las Validaciones (Constraints)

### Probar moneda inválida (debe fallar):
```sql
INSERT INTO cuentas (user_id, nombre_cuenta, moneda, tipo_cuenta)
VALUES ('<USER_UUID>', 'Test', 'JPY', 'bancaria');
-- Error: nueva fila en la relación «cuentas» viola la restricción check «check_moneda»
```

### Probar tipo de cuenta inválido (debe fallar):
```sql
INSERT INTO cuentas (user_id, nombre_cuenta, moneda, tipo_cuenta)
VALUES ('<USER_UUID>', 'Test', 'MXN', 'credito');
-- Error: nueva fila en la relación «cuentas» viola la restricción check «check_tipo_cuenta»
```

### Probar fecha de corte fuera de rango (debe fallar):
```sql
INSERT INTO cuentas (user_id, nombre_cuenta, moneda, tipo_cuenta, fecha_corte_dia)
VALUES ('<USER_UUID>', 'Test', 'MXN', 'bancaria', 35);
-- Error: nueva fila en la relación «cuentas» viola la restricción check «check_fecha_corte»
```

✅ Si estos INSERT fallan con errores de constraint, ¡todo está funcionando correctamente!

## ✅ PASO 7: Probar el Trigger de updated_at

```sql
-- Insertar una cuenta
INSERT INTO cuentas (user_id, nombre_cuenta, moneda, tipo_cuenta)
VALUES ('<USER_UUID>', 'Test Trigger', 'MXN', 'bancaria')
RETURNING id, created_at, updated_at;

-- Esperar unos segundos...

-- Actualizar la cuenta
UPDATE cuentas
SET nombre_cuenta = 'Test Trigger Actualizado'
WHERE nombre_cuenta = 'Test Trigger'
RETURNING id, created_at, updated_at;
```

✅ Verifica que `updated_at` cambió a la hora actual después del UPDATE.

## ✅ PASO 8: Limpiar Datos de Prueba

Cuando termines de probar:

```sql
-- Eliminar cuentas de prueba
DELETE FROM cuentas
WHERE nombre_cuenta LIKE '%Prueba%' OR nombre_cuenta LIKE '%Test%';
```

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "relation 'auth.users' does not exist"
**Solución:** Asegúrate de estar en el proyecto correcto de Supabase. La tabla `auth.users` es creada automáticamente por Supabase.

### Error: "permission denied for schema auth"
**Solución:** Usa el Service Role Key en lugar de la anon key. En el SQL Editor de Supabase Dashboard, esto no debería ser un problema.

### Error: "function uuid_generate_v4() does not exist"
**Solución:** Ejecuta primero:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### La tabla se creó pero no veo los triggers
**Solución:** Verifica con:
```sql
SELECT tgname, tgtype
FROM pg_trigger
WHERE tgrelid = 'cuentas'::regclass;
```

## 📚 RECURSOS ADICIONALES

- [Supabase SQL Editor Docs](https://supabase.com/docs/guides/database/sql-editor)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## ✅ CHECKLIST FINAL

- [ ] Tabla `cuentas` creada exitosamente
- [ ] Todos los índices están presentes
- [ ] Triggers funcionando correctamente
- [ ] Constraints validando datos
- [ ] Datos de prueba insertados y funcionando
- [ ] RLS deshabilitado (por ahora)

---

**Próximo paso:** Una vez que la tabla esté creada, puedes continuar con la implementación del frontend (modal, páginas, etc.)
