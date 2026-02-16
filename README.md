# Hub - DDInsights

Sistema Hub - DDInsights focado em dashboards Power BI embarcados e gestão de apresentações para TV.

## 🚀 Funcionalidades Principais

### 📊 Embedded Power BI
- **Dashboards Embarcados**: Visualização de relatórios e workspaces do Power BI diretamente na aplicação.
- **Autenticação Segura**: Gerenciamento de tokens via Service Principal (Azure AD).
- **Controles de Visualização**: Ajuste dinâmico de layout (Ajustar à página, Largura, Tamanho real).

### 📺 Apresentações (TV)
- **Gestão de Apresentações**: Cadastro e organização de apresentações para TVs e painéis.
- **Publicação**: Controle de quais apresentações estão ativas/publicadas.
- **Visualização em Tela**: Modo dedicado para exibição contínua em televisões.

### 🔐 Autenticação e Segurança
- **Supabase Auth**: Sistema de login e controle de acesso dos usuários.
- **Proteção de Rotas**: Acesso restrito para páginas privadas.

### 📱 Experiência do Usuário (UX)
- **PWA (Progressive Web App)**: Instalável como aplicativo nativo.
- **Design Moderno**: Interface construída com Shadcn/ui e Tailwind CSS.
- **Responsividade**: Totalmente adaptável para desktop e mobile.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, TypeScript, Vite
- **Estilização**: Tailwind CSS, Shadcn/ui
- **Dados & Backend**: Supabase (Auth/DB), TanStack Query
- **Integrações**:
-  - `powerbi-client-react`: SDK para embed do Power BI.
- **Bibliotecas**: Framer Motion (animações), Lucide React (ícones), Axios.

## ⚙️ Configuração

Para rodar o projeto, crie um arquivo `.env` na raiz com as seguintes variáveis:

```env
# Configurações do Power BI (Azure AD)
VITE_MSAL_TENANT_ID=seu-tenant-id
VITE_MSAL_CLIENT_ID=seu-client-id
VITE_MSAL_CLIENT_SECRET=seu-client-secret

# Configurações do Supabase
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anon

# Configurações Gerais
VITE_API_URL=http://localhost:8080
```

## 📦 Instalação e Execução

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse a aplicação em `http://localhost:8080` (ou a porta indicada no terminal).
