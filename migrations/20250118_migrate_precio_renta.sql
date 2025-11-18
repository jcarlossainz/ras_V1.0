-- Migration: Move precio_renta_disponible to precios.mensual JSONB field
-- Date: 2025-01-18
-- Purpose: Consolidate rental price data into the precios JSONB structure

-- Step 1: Migrate data from precio_renta_disponible to precios.mensual
UPDATE propiedades
SET precios = COALESCE(precios, '{}'::jsonb) ||
              jsonb_build_object('mensual', precio_renta_disponible)
WHERE precio_renta_disponible IS NOT NULL;

-- Step 2: Verify migration (optional - run this separately to check results)
-- SELECT id, nombre_propiedad, precio_renta_disponible,
--        precios->>'mensual' as precio_nuevo_mensual, precios
-- FROM propiedades
-- WHERE precio_renta_disponible IS NOT NULL
-- LIMIT 10;

-- Step 3: Drop the old column (only run after verifying step 2)
-- ALTER TABLE propiedades DROP COLUMN precio_renta_disponible;
