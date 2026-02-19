
-- Tabela para armazenar permissões de visualização por página (aba) de dashboard
CREATE TABLE IF NOT EXISTS public.powerbi_dashboard_page_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id TEXT NOT NULL, -- ID do relatório no Power BI
  page_name TEXT NOT NULL,    -- Nome técnico da página (ReportSection...)
  page_display_name TEXT,     -- Nome amigável da página (opcional, para referência)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Garante que não haja duplicidade de permissão para o mesmo usuário na mesma página
  UNIQUE(dashboard_id, page_name, user_id)
);

-- Habilitar RLS
ALTER TABLE public.powerbi_dashboard_page_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS

-- 1. Leitura:
-- - Admin Master vê tudo
-- - Admin vê se o dashboard pertence à organização dele (precisaria de join com settings, mas simplificando: admin vê tudo por enquanto ou restrito por org se tiver o campo)
-- - Usuário vê APENAS suas próprias permissões (para saber quais páginas pode acessar)
CREATE POLICY "Usuários veem suas próprias permissões de página"
ON public.powerbi_dashboard_page_permissions
FOR SELECT
USING (
  (auth.uid() = user_id) OR
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_master', 'admin')))
);

-- 2. Escrita (Insert/Update/Delete):
-- - Apenas Admins e Admin Master podem gerenciar permissões
CREATE POLICY "Apenas admins gerenciam permissões de página"
ON public.powerbi_dashboard_page_permissions
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_master', 'admin'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_page_permissions_dashboard_user ON public.powerbi_dashboard_page_permissions(dashboard_id, user_id);
