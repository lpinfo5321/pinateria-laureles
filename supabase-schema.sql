-- ============================================================
--   SCHEMA PARA PIÑATERÍA LAURELES · APP DE ÓRDENES
--   Copia y pega TODO este archivo en el SQL Editor de Supabase
--   y presiona "Run". Solo se corre una vez.
-- ============================================================

-- ───── Tabla de órdenes ─────
CREATE TABLE IF NOT EXISTS public.orders (
  id          TEXT        PRIMARY KEY,
  numero      SERIAL      UNIQUE,
  estado      TEXT        NOT NULL DEFAULT 'pendiente',
  pagado      BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_estado_idx     ON public.orders (estado);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

-- ───── Tabla de configuración (un solo registro, id='default') ─────
CREATE TABLE IF NOT EXISTS public.app_config (
  id         TEXT        PRIMARY KEY DEFAULT 'default',
  whatsapp   TEXT        DEFAULT '',
  nombre     TEXT        DEFAULT 'Piñatería Laureles',
  direccion  TEXT        DEFAULT 'Laureles',
  pin        TEXT        DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas de colores si no existen (ejecutar si la tabla ya existe)
ALTER TABLE public.app_config ADD COLUMN IF NOT EXISTS colores       JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.app_config ADD COLUMN IF NOT EXISTS colores_picos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.app_config ADD COLUMN IF NOT EXISTS colores_tambor JSONB DEFAULT '[]'::jsonb;

INSERT INTO public.app_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ───── Actualización automática de updated_at ─────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_touch ON public.orders;
CREATE TRIGGER orders_touch
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS config_touch ON public.app_config;
CREATE TRIGGER config_touch
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ───── Row Level Security ─────
-- (política abierta porque es una app interna del negocio;
--  el PIN del admin es la capa de protección en el frontend)
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_all" ON public.orders;
CREATE POLICY "orders_all"
  ON public.orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "config_all" ON public.app_config;
CREATE POLICY "config_all"
  ON public.app_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ───── Habilitar Realtime ─────
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
