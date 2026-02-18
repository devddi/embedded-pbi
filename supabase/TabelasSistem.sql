##Tabela profiles com os usuários cadastrados no sistema vinculado com a users do supabase

create table public.profiles (
  id uuid not null,
  first_name text null,
  last_name text null,
  organization_id uuid null,
  is_active boolean null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();

##Tabela de regras dos usuários

create table public.user_roles (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamp with time zone not null default now(),
  constraint user_roles_pkey primary key (id),
  constraint user_roles_user_id_role_key unique (user_id, role),
  constraint user_roles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

##Tabela de organizações (empresas que o usuario admin cadastrou)

create table public.organizations (
  id uuid not null default gen_random_uuid (),
  name text not null,
  owner_id uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint organizations_pkey primary key (id),
  constraint organizations_owner_id_fkey foreign KEY (owner_id) references profiles (id)
) TABLESPACE pg_default;

alter table public.profiles
  add constraint profiles_organization_id_fkey foreign key (organization_id) references public.organizations (id);

##Tabela de membros da organização (usuários que pertencem a uma organização)

create table public.organization_members (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  user_id uuid not null,
  role text not null,
  created_at timestamp with time zone not null default now(),
  constraint organization_members_pkey primary key (id),
  constraint organization_members_user_org_unique unique (user_id, organization_id),
  constraint organization_members_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint organization_members_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint organization_members_role_check check (
    (role = any (array['admin'::text, 'member'::text]))
  )
) TABLESPACE pg_default;

##Tabela de contas power Bi que os admin adicionaram às organizações

create table public.powerbi_clients (
  id uuid not null default gen_random_uuid (),
  name text not null,
  client_id text not null,
  tenant_id text not null,
  client_secret text not null,
  email text not null,
  password text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  organization_id uuid null,
  constraint powerbi_clients_pkey primary key (id),
  constraint powerbi_clients_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_powerbi_clients_updated_at BEFORE
update on powerbi_clients for EACH row
execute FUNCTION update_updated_at_column ();

##Tabela de configurações dos dashboard dos power Bi

create table public.powerbi_dashboard_settings (
  id uuid not null default gen_random_uuid (),
  dashboard_id text not null,
  is_visible boolean null default true,
  assigned_users jsonb null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint powerbi_dashboard_settings_pkey primary key (id),
  constraint powerbi_dashboard_settings_dashboard_id_key unique (dashboard_id)
) TABLESPACE pg_default;

create trigger update_powerbi_dashboard_settings_updated_at BEFORE
update on powerbi_dashboard_settings for EACH row
execute FUNCTION update_updated_at_column ();

##Tabela de apresentação de slides do power Bi

create table public.tv_presentation_slides (
  id uuid not null default extensions.uuid_generate_v4 (),
  presentation_id uuid null,
  workspace_id text not null,
  report_id text not null,
  report_name text null,
  page_name text null,
  page_display_name text null,
  duration integer null default 30,
  order_index integer not null,
  embed_url text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint tv_presentation_slides_pkey primary key (id),
  constraint tv_presentation_slides_presentation_id_fkey foreign KEY (presentation_id) references tv_presentations (id) on delete CASCADE
) TABLESPACE pg_default;

## Tabela com os nomes das apresentação

create table public.tv_presentations (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  created_by uuid null,
  is_active boolean null default true,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint tv_presentations_pkey primary key (id),
  constraint tv_presentations_created_by_fkey foreign KEY (created_by) references auth.users (id)
) TABLESPACE pg_default;

create trigger update_tv_presentations_updated_at BEFORE
update on tv_presentations for EACH row
execute FUNCTION update_updated_at_column ();