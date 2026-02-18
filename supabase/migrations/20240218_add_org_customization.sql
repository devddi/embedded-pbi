-- Adicionar colunas para customização da organização
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#000000'; -- Cor padrão preta ou outra de sua preferência
