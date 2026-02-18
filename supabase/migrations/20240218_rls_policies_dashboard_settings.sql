-- Habilitar RLS
ALTER TABLE public.powerbi_dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Usuários veem dashboards da sua organização" ON public.powerbi_dashboard_settings;
DROP POLICY IF EXISTS "Admins gerenciam dashboards da sua organização" ON public.powerbi_dashboard_settings;
DROP POLICY IF EXISTS "Ver dashboards da própria organização" ON public.powerbi_dashboard_settings;
DROP POLICY IF EXISTS "Gerenciar dashboards da própria organização" ON public.powerbi_dashboard_settings;

-- Política de Leitura (SELECT)
CREATE POLICY "Ver dashboards da própria organização"
ON public.powerbi_dashboard_settings
FOR SELECT
USING (
  -- Admin Master vê tudo
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin_master'
  OR
  -- Usuário vê se o dashboard é da organização onde ele é membro
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
  OR
  -- Usuário vê se o dashboard é da organização onde ele é dono
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

-- Política de Escrita (INSERT/UPDATE/DELETE)
CREATE POLICY "Gerenciar dashboards da própria organização"
ON public.powerbi_dashboard_settings
FOR ALL
USING (
  -- Admin Master pode tudo
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin_master'
  OR
  (
    -- Usuário deve ser Admin
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
    AND
    (
      -- Pode gerenciar se for membro da organização
      organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
      OR
      -- Pode gerenciar se for dono da organização
      organization_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
    )
  )
);
