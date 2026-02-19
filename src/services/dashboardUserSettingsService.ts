
import { supabase } from "@/integrations/supabase/client";

export interface DashboardUserSetting {
  id?: string;
  dashboard_id: string;
  user_id: string;
  rls_role: string;
}

const TABLE_NAME = "powerbi_dashboard_user_settings";

/**
 * Obtém a configuração de RLS para um usuário específico em um dashboard.
 */
export const getUserDashboardSettings = async (
  dashboardId: string,
  userId: string
): Promise<DashboardUserSetting | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("dashboard_id", dashboardId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Erro ao buscar user settings:", error);
    // Não lança erro, retorna null (usa default)
    return null;
  }

  return data as DashboardUserSetting | null;
};

/**
 * Salva ou atualiza a configuração de RLS para um usuário.
 */
export const upsertUserDashboardSetting = async (
  setting: DashboardUserSetting
): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      {
        dashboard_id: setting.dashboard_id,
        user_id: setting.user_id,
        rls_role: setting.rls_role,
      },
      { onConflict: "dashboard_id,user_id" }
    );

  if (error) {
    throw new Error(`Erro ao salvar user setting: ${error.message}`);
  }
};
