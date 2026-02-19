
import { supabase } from "@/integrations/supabase/client";

export interface DashboardPagePermission {
  id: string;
  dashboard_id: string;
  page_name: string;
  page_display_name?: string;
  user_id: string;
  created_at?: string;
}

const TABLE_NAME = "powerbi_dashboard_page_permissions";

/**
 * Obtém todas as permissões de página para um dashboard específico.
 * Útil para a tela de gerenciamento (admin).
 */
export const getDashboardPagePermissions = async (
  dashboardId: string
): Promise<DashboardPagePermission[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("dashboard_id", dashboardId);

  if (error) {
    console.error("Erro ao buscar permissões de página:", error);
    throw new Error(`Erro ao buscar permissões de página: ${error.message}`);
  }

  return data as DashboardPagePermission[];
};

/**
 * Obtém as páginas permitidas para um usuário em um dashboard.
 * Se o usuário não tiver nenhuma permissão específica, retorna null (indicando acesso total).
 */
export const getUserAllowedPages = async (
  dashboardId: string,
  userId: string
): Promise<string[] | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("page_name")
    .eq("dashboard_id", dashboardId)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao verificar permissões de página do usuário:", error);
    // Em caso de erro, por segurança, poderíamos retornar array vazio, 
    // mas para manter a UX fluida, vamos logar e assumir null (tudo) ou vazio (nada).
    // Vamos assumir vazio (nada) por segurança se der erro de banco.
    return [];
  }

  // Se não tem registros, retorna null (significa que não há restrição explícita, então vê tudo)
  if (!data || data.length === 0) {
    return null;
  }

  return data.map((p) => p.page_name);
};

/**
 * Atualiza as permissões de uma página específica do dashboard.
 * Remove permissões anteriores para essa página e adiciona as novas (lista de usuários).
 */
export const updatePagePermissions = async (
  dashboardId: string,
  pageName: string,
  pageDisplayName: string,
  userIds: string[]
): Promise<void> => {
  // 1. Remove permissões existentes para esta página neste dashboard
  //    (para os usuários que não estão mais na lista, ou para limpar tudo e recriar)
  //    Na verdade, a UI deve mandar a lista completa de usuários que TEM acesso.
  //    Então removemos tudo dessa página e inserimos os novos.
  
  const { error: deleteError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("dashboard_id", dashboardId)
    .eq("page_name", pageName);

  if (deleteError) {
    throw new Error(`Erro ao limpar permissões antigas: ${deleteError.message}`);
  }

  if (userIds.length === 0) {
    return; // Se a lista é vazia, acabou (ninguém tem permissão explícita, ou seja, volta ao default? Não, aqui estamos definindo quem vê ESSA página. Se ninguém vê, ninguém vê?)
    // Espera. Se eu removo todos os usuários de uma página, ela deixa de ter restrição?
    // O modelo "Se user não tem permissão, vê tudo" funciona por USER.
    // Se eu removo a permissão do User A na Página 1, ele deixa de ter registro.
    // Se ele não tiver registro em NENHUMA outra página, ele volta a ver TUDO.
    // Isso pode ser confuso.
    
    // Melhor abordagem para a UI: "Quem pode ver esta página?"
    // Se a lista estiver vazia, significa que NINGUÉM tem permissão explícita DESTA página.
    // Mas a regra é por USER.
    // Se eu quero que o User A veja SÓ a Página 1, eu adiciono (User A, Page 1).
    // Se eu quero que o User A veja TUDO, eu não adiciono nada.
    
    // Então, updatePagePermissions vai gerenciar a lista de usuários para UMA página.
  }

  // 2. Insere as novas permissões
  const newPermissions = userIds.map((userId) => ({
    dashboard_id: dashboardId,
    page_name: pageName,
    page_display_name: pageDisplayName,
    user_id: userId,
  }));

  const { error: insertError } = await supabase
    .from(TABLE_NAME)
    .insert(newPermissions);

  if (insertError) {
    throw new Error(`Erro ao salvar novas permissões: ${insertError.message}`);
  }
};

/**
 * Remove todas as permissões de um usuário para um dashboard (reseta para "ver tudo").
 */
export const clearUserPermissions = async (
  dashboardId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("dashboard_id", dashboardId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Erro ao limpar permissões do usuário: ${error.message}`);
  }
};
