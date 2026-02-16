# Prompt para Criação de Sistema Power BI Embedded e Slideshow

## Objetivo
Criar uma aplicação web Single Page Application (SPA) focada exclusivamente em:
1.  **Embed de Relatórios do Power BI**: Exibir relatórios de forma segura usando "App owns data" (Service Principal).
2.  **Modo de Apresentação (TV)**: Criar e reproduzir playlists de relatórios/páginas que rotacionam automaticamente, ideal para TVs corporativas.
3.  **Autenticação**: Login de usuários via Supabase e autenticação no Power BI via Azure AD (backend).

## Tech Stack
-   **Frontend**: React, Vite, TypeScript, Tailwind CSS.
-   **Backend**: Vercel Serverless Functions (ou API Routes do Next.js, se preferir, mas o exemplo usa Vercel puro com Vite).
-   **Banco de Dados & Auth**: Supabase.
-   **Power BI**: `powerbi-client`, `powerbi-client-react`.

---

## 1. Estrutura do Banco de Dados (Supabase)

Execute o seguinte SQL no editor do Supabase para criar as tabelas e políticas de segurança (RLS):

```sql
-- Tabela de Apresentações (Playlists)
CREATE TABLE IF NOT EXISTS public.tv_presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Slides (Itens da Playlist)
CREATE TABLE IF NOT EXISTS public.tv_presentation_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    presentation_id UUID REFERENCES public.tv_presentations(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    report_id TEXT NOT NULL,
    report_name TEXT,
    page_name TEXT, -- Nome interno da página no Power BI (ex: ReportSection...)
    page_display_name TEXT, -- Nome legível da página
    duration INTEGER DEFAULT 30, -- Duração em segundos
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.tv_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_presentation_slides ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Simplificadas para Leitura Pública, Escrita Autenticada)
CREATE POLICY "Enable read access for all users" ON public.tv_presentations FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.tv_presentations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for owners" ON public.tv_presentations FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Enable delete for owners" ON public.tv_presentations FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Enable read access for all slides" ON public.tv_presentation_slides FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.tv_presentation_slides FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for slide owners" ON public.tv_presentation_slides FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tv_presentations p WHERE p.id = presentation_id AND p.created_by = auth.uid())
);
CREATE POLICY "Enable delete for slide owners" ON public.tv_presentation_slides FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tv_presentations p WHERE p.id = presentation_id AND p.created_by = auth.uid())
);
```

---

## 2. Backend (Serverless Function)

Use um arquivo `api/powerbi.ts` que busque **sempre** as credenciais de Service Principal a partir da tabela `powerbi_clients` no Supabase, em vez de variáveis de ambiente MSAL. O handler deve:

- Receber opcionalmente `clientId` via query string.
- Consultar `powerbi_clients` para obter `tenant_id`, `client_id` e `client_secret` (do cliente selecionado ou o primeiro registro).
- Obter o access token no Azure AD com essas credenciais.
- Se `path === 'get-access-token'`, devolver `{ access_token }`.
- Caso contrário, atuar como proxy para `https://api.powerbi.com/{path}` usando o access token.

---

## 3. Frontend (Serviço de API)

Crie `src/services/powerBiApiService.ts` para consumir o backend.

```typescript
// src/services/powerBiApiService.ts
import { models } from "powerbi-client";

// ... Interfaces (Report, Page, etc.)

export const getAccessToken = async (): Promise<string> => {
  // Em produção, chama a API serverless
  const response = await fetch(`/api/powerbi?path=get-access-token`);
  const data = await response.json();
  return data.access_token;
};

export const getEmbedToken = async (workspaceId: string, reportId: string): Promise<string> => {
  // Chama a API para gerar token (POST)
  const path = `v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;
  const response = await fetch(`/api/powerbi?path=${path}`, {
    method: 'POST',
    body: JSON.stringify({ accessLevel: 'View' })
  });
  const data = await response.json();
  return data.token;
};

// ... Funções para getWorkspaces, getReports, getPages usando a mesma lógica de proxy
```

---

## 4. Componente de Apresentação (TV Mode)

Lógica principal para o arquivo `src/pages/TVPresentationViewer.tsx`:

1.  **Carregar Dados**: Ao montar, busca os slides da apresentação no Supabase (`tv_presentation_slides`) ordenados por `order_index`.
2.  **Estado**:
    *   `currentSlideIndex`: number (começa em 0).
    *   `timeLeft`: number (inicializado com a duração do slide atual).
    *   `isPlaying`: boolean (controle de pausa).
3.  **Timer (useEffect)**:
    *   Se `isPlaying` e `timeLeft > 0`, decrementa `timeLeft` a cada 1s.
    *   Se `timeLeft === 0`, chama `nextSlide()`.
4.  **Troca de Slide (`nextSlide`)**:
    *   Incrementa `currentSlideIndex`. Se chegar ao fim, volta para 0 (loop).
    *   Reseta `timeLeft` para a duração do novo slide.
    *   **Importante**: Gera um *novo* Embed Token para o novo relatório (se o relatório mudar).
5.  **Renderização**:
    *   Usa `<PowerBIEmbed />` do `powerbi-client-react`.
    *   Props chave:
        *   `embedConfig`:
            *   `type: 'report'`
            *   `id`: `slide.report_id`
            *   `embedUrl`: `https://app.powerbi.com/reportEmbed?reportId=${slide.report_id}&groupId=${slide.workspace_id}`
            *   `accessToken`: (Token gerado via `getEmbedToken`)
            *   `pageName`: `slide.page_name` (Isso faz abrir na página certa!)
            *   `settings`: `{ navContentPaneEnabled: false, filterPaneEnabled: false }` (Modo "limpo" para TV).

---

## 5. Variáveis de Ambiente (.env)

Crie um arquivo `.env` (local) e configure no painel da Vercel/Netlify.

```ini
# Supabase (Frontend)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Microsoft Azure (Backend - Não prefixar com VITE_)
# Obtenha no Portal Azure -> App Registrations
MSAL_TENANT_ID=seu-tenant-id
MSAL_CLIENT_ID=seu-client-id
MSAL_CLIENT_SECRET=seu-client-secret
```

---

## 6. Passos para Configuração no Azure

1.  Crie um **App Registration** no Azure Portal.
2.  Gere um **Client Secret**.
3.  Adicione permissões de API: **Power BI Service** -> `Tenant.Read.All`, `Report.Read.All` (Application permissions, não Delegated).
4.  Grant Admin Consent.
5.  Crie um **Security Group** no Azure AD e adicione o Service Principal (App) a ele.
6.  No **Power BI Admin Portal**, habilite "Allow service principals to use Power BI APIs" e restrinja ao grupo de segurança criado.
7.  Adicione o Service Principal (App) como **Membro** ou **Admin** nos Workspaces do Power BI que deseja exibir.
