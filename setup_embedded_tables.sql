-- ==============================================================================
-- SCRIPT DE CONFIGURAÇÃO DE TABELAS PARA O PROJETO DDINSIGHTS EMBEDDED
-- Funcionalidades: Autenticação, Power BI Embedded, TV Dashboards
-- ==============================================================================

-- 1. Configurações Iniciais e Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enum de Roles
-- Define os papéis disponíveis no sistema
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin_master', 'admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Função de Timestamp (Utilitária)
-- Atualiza automaticamente a coluna updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Tabela de Perfis (profiles)
-- Armazena dados adicionais dos usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Trigger para updated_at em profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Tabela de Roles (user_roles)
-- Associa usuários aos seus papéis
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 6. Trigger para criar perfil automaticamente ao criar usuário
-- Quando um usuário é criado no Auth do Supabase, cria um perfil correspondente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Tabela de Configurações do Power BI (powerbi_dashboard_settings)
-- Armazena visibilidade e permissões dos dashboards
CREATE TABLE IF NOT EXISTS public.powerbi_dashboard_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id text NOT NULL UNIQUE,
  is_visible boolean DEFAULT true,
  assigned_users jsonb DEFAULT '[]'::jsonb, -- Lista de IDs de usuários que podem ver
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Trigger para updated_at em dashboard_settings
DROP TRIGGER IF EXISTS update_powerbi_dashboard_settings_updated_at ON public.powerbi_dashboard_settings;
CREATE TRIGGER update_powerbi_dashboard_settings_updated_at
  BEFORE UPDATE ON public.powerbi_dashboard_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Tabelas de Apresentação TV (tv_presentations e slides)
-- Armazena as apresentações para TV e seus slides
CREATE TABLE IF NOT EXISTS public.tv_presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tv_presentation_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    presentation_id UUID REFERENCES public.tv_presentations(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    report_id TEXT NOT NULL,
    report_name TEXT,
    page_name TEXT,
    page_display_name TEXT,
    duration INTEGER DEFAULT 30,
    order_index INTEGER NOT NULL,
    embed_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para updated_at em tv_presentations
DROP TRIGGER IF EXISTS update_tv_presentations_updated_at ON public.tv_presentations;
CREATE TRIGGER update_tv_presentations_updated_at
  BEFORE UPDATE ON public.tv_presentations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Tabela de Clientes Power BI (powerbi_clients)
-- Armazena as credenciais de cada cliente para autenticação no Power BI
CREATE TABLE IF NOT EXISTS public.powerbi_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id text NOT NULL,
  tenant_id text NOT NULL,
  client_secret text NOT NULL,
  email text NOT NULL,
  password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_powerbi_clients_updated_at ON public.powerbi_clients;
CREATE TRIGGER update_powerbi_clients_updated_at
  BEFORE UPDATE ON public.powerbi_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Políticas de Segurança (RLS - Row Level Security)
-- Habilita segurança em nível de linha para todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerbi_dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_presentation_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerbi_clients ENABLE ROW LEVEL SECURITY;

-- Políticas Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
);

-- Políticas Roles
CREATE POLICY "Users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
);

-- Políticas Dashboard Settings
CREATE POLICY "Users can view settings" ON public.powerbi_dashboard_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.powerbi_dashboard_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
);

-- Políticas Power BI Clients
CREATE POLICY "Admins can view clients" ON public.powerbi_clients FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
);
CREATE POLICY "Admins can manage clients" ON public.powerbi_clients FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin_master')
);

-- Políticas TV Presentations
CREATE POLICY "Enable read access for all users" ON public.tv_presentations FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.tv_presentations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for owners or admins" ON public.tv_presentations FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
);
CREATE POLICY "Enable delete for owners or admins" ON public.tv_presentations FOR DELETE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
);

-- Políticas TV Slides
CREATE POLICY "Enable read access for all slides" ON public.tv_presentation_slides FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.tv_presentation_slides FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for slide owners or admins" ON public.tv_presentation_slides FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.tv_presentations p 
        WHERE p.id = presentation_id AND (
            p.created_by = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
        )
    )
);
CREATE POLICY "Enable delete for slide owners or admins" ON public.tv_presentation_slides FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.tv_presentations p 
        WHERE p.id = presentation_id AND (
            p.created_by = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'admin_master'))
        )
    )
);

-- 10. Inserir usuário Admin Inicial (Opcional - Substitua o ID pelo seu ID de usuário após criar a conta)
-- INSERT INTO public.user_roles (user_id, role) VALUES ('SEU-UUID-AQUI', 'admin_master');
