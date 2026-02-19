
-- Adicionar colunas para configuração de RLS
ALTER TABLE public.powerbi_dashboard_settings
ADD COLUMN IF NOT EXISTS enable_rls BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rls_role TEXT DEFAULT 'User';
