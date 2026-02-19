export interface Workspace {
  id: string;
  name: string;
  isReadOnly: boolean;
  isOnDedicatedCapacity: boolean;
}

export interface Report {
  id: string;
  name: string;
  embedUrl: string;
  webUrl: string;
  workspaceId: string; // Adicionado para facilitar o uso
  workspaceName?: string; // Adicionado para facilitar a exibição
  datasetId?: string;     // Importante para RLS
}

export interface ReportPage {
  name: string;
  displayName: string;
  order: number;
}

interface EmbedToken {
  token: string;
  tokenId: string;
  expiration: string;
}

const accessTokenCache: Record<string, string | null> = {};

/**
 * Obtém o Access Token para autenticação com o Power BI via Service Principal.
 * Reutiliza o token se ainda for válido.
 * @returns Promise<string> O access token.
 */
export const getAccessToken = async (clientId?: string): Promise<string> => {
  const cacheKey = clientId || 'default';

  if (accessTokenCache[cacheKey]) {
    return accessTokenCache[cacheKey] as string;
  }

  try {
    const url =
      clientId != null
        ? `/api/powerbi?clientId=${encodeURIComponent(clientId)}&path=get-access-token`
        : `/api/powerbi?path=get-access-token`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      console.error("Erro ao obter access token (status não OK):", {
        status: response.status,
        body: text,
      });
      throw new Error(`Falha na autenticação: ${response.status} - ${text}`);
    }

    const text = await response.text();
    let data: { access_token?: string; error?: string };

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Resposta inválida da API /api/powerbi ao obter access token:", text);
      throw new Error("Resposta inválida da API de autenticação do Power BI. Verifique se a função /api/powerbi está rodando corretamente.");
    }

    if (!data.access_token) {
      console.error("Resposta da API /api/powerbi não contém access_token:", data);
      throw new Error("A resposta da API de autenticação não contém access_token.");
    }

    accessTokenCache[cacheKey] = data.access_token;
    
    setTimeout(() => {
      accessTokenCache[cacheKey] = null;
    }, 50 * 60 * 1000);

    return data.access_token;
  } catch (error) {
    console.error("Erro ao obter token:", error);
    throw new Error("Não foi possível autenticar com o Power BI.");
  }
};

export interface RLSIdentity {
  username: string;
  roles: string[];
  datasets: string[];
}

/**
 * Obtém o Embed Token para um relatório específico.
 * @param workspaceId O ID do workspace.
 * @param reportId O ID do relatório.
 * @param identity Opcional: Identidade do usuário para RLS.
 * @returns Promise<string> O embed token.
 */
export const getEmbedToken = async (
  workspaceId: string,
  reportId: string,
  clientId?: string,
  identity?: RLSIdentity
): Promise<string> => {
  const accessToken = await getAccessToken(clientId);
  
  try {
    let response;
    const path = `v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;
    
    const body: any = { accessLevel: 'View' };
    if (identity) {
      body.identities = [identity];
    }

    if (import.meta.env.DEV) {
      response = await fetch(`/powerbi-api/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } else {
      const url =
        clientId != null
          ? `/api/powerbi?clientId=${encodeURIComponent(clientId)}&path=${encodeURIComponent(path)}`
          : `/api/powerbi?path=${encodeURIComponent(path)}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    if (!response.ok) {
      throw new Error('Falha ao gerar embed token');
    }

    const data: EmbedToken = await response.json();
    return data.token;
  } catch (error) {
    console.error("Erro ao obter embed token:", error);
    throw error;
  }
};

/**
 * Obtém a lista de todos os workspaces do Power BI.
 * @returns Promise<Workspace[]> A lista de workspaces.
 */
export const getWorkspaces = async (clientId?: string): Promise<Workspace[]> => {
  const accessToken = await getAccessToken(clientId);
  
  try {
    let response;
    const path = "v1.0/myorg/groups";
    
    const url =
      clientId != null
        ? `/api/powerbi?clientId=${encodeURIComponent(clientId)}&path=${encodeURIComponent(path)}`
        : `/api/powerbi?path=${encodeURIComponent(path)}`;
    response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao carregar workspaces: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.value || [];
  } catch (e) {
    console.error("Erro ao carregar workspaces:", e);
    throw e;
  }
};

/**
 * Obtém a lista de relatórios em um workspace específico.
 * @param workspaceId O ID do workspace.
 * @returns Promise<Report[]> A lista de relatórios.
 */
export const getReportsInWorkspace = async (
  workspaceId: string,
  clientId?: string,
): Promise<Report[]> => {
  const accessToken = await getAccessToken(clientId);
  
  try {
    let response;
    const path = `v1.0/myorg/groups/${workspaceId}/reports`;
    
    const url =
      clientId != null
        ? `/api/powerbi?clientId=${encodeURIComponent(clientId)}&path=${encodeURIComponent(path)}`
        : `/api/powerbi?path=${encodeURIComponent(path)}`;
    response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao carregar relatórios do workspace ${workspaceId}: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.value || [];
  } catch (e) {
    console.error(`Erro ao carregar relatórios do workspace ${workspaceId}:`, e);
    throw e;
  }
};

/**
 * Obtém todos os relatórios de todos os workspaces.
 * @returns Promise<Report[]> Uma lista consolidada de todos os relatórios.
 */
export const getAllReports = async (clientId?: string): Promise<Report[]> => {
  try {
    const workspaces = await getWorkspaces(clientId);
    let allReports: Report[] = [];

    for (const workspace of workspaces) {
      const reports = await getReportsInWorkspace(workspace.id, clientId);
      const reportsWithWorkspaceData = reports.map(report => ({
        ...report,
        workspaceId: workspace.id,
        workspaceName: workspace.name
      }));
      allReports = allReports.concat(reportsWithWorkspaceData);
    }
    return allReports;
  } catch (e) {
    console.error("Erro ao obter todos os relatórios:", e);
    throw e;
  }
};

/**
 * Obtém as páginas de um relatório específico.
 * @param workspaceId O ID do workspace.
 * @param reportId O ID do relatório.
 * @returns Promise<ReportPage[]> A lista de páginas.
 */
export const getReportPages = async (
  workspaceId: string,
  reportId: string,
  clientId?: string,
): Promise<ReportPage[]> => {
  const accessToken = await getAccessToken(clientId);
  
  try {
    let response;
    const path = `v1.0/myorg/groups/${workspaceId}/reports/${reportId}/pages`;
    
    const url =
      clientId != null
        ? `/api/powerbi?clientId=${encodeURIComponent(clientId)}&path=${encodeURIComponent(path)}`
        : `/api/powerbi?path=${encodeURIComponent(path)}`;
    response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao carregar páginas do relatório: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.value || [];
  } catch (e) {
    console.error(`Erro ao carregar páginas do relatório ${reportId}:`, e);
    throw e;
  }
};
