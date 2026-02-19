
-- Tabela para armazenar configurações específicas de usuário por dashboard (ex: qual Role RLS usar)
CREATE TABLE IF NOT EXISTS public.powerbi_dashboard_user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rls_role TEXT NOT NULL DEFAULT 'RLS', -- Default para a role mais restritiva
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(dashboard_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.powerbi_dashboard_user_settings ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Admin gerencia user settings"
ON public.powerbi_dashboard_user_settings
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_master', 'admin'))
);

CREATE POLICY "Usuário vê suas próprias settings"
ON public.powerbi_dashboard_user_settings
FOR SELECT
USING (auth.uid() = user_id);
