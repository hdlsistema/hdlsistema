-- Migración 001: tabla técnica para health checks y auditoría de estado
-- Aplicar en: Supabase → SQL Editor → New query → Run
-- Esta migración es idempotente (puede ejecutarse múltiples veces de forma segura).

CREATE TABLE IF NOT EXISTS public.system_health (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name  text          NOT NULL,
  status        text          NOT NULL CHECK (status IN ('ok', 'degraded', 'down')),
  checked_at    timestamptz   NOT NULL DEFAULT now()
);

-- Índice para consultas por servicio y tiempo
CREATE INDEX IF NOT EXISTS idx_system_health_service_time
  ON public.system_health (service_name, checked_at DESC);

-- RLS: solo el service role puede escribir; lecturas bloqueadas por defecto
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Política explícita de denegación (RLS activo sin políticas = deny all)
-- El backend usa supabaseAdminClient (service role) que bypasa RLS.

COMMENT ON TABLE public.system_health IS
  'Tabla técnica para verificación de conectividad. No contiene datos operativos.';
