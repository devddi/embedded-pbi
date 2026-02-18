import { supabase } from "@/integrations/supabase/client";

export interface PowerBIClient {
  id?: string;
  name: string;
  client_id: string;
  tenant_id: string;
  client_secret: string;
  email: string;
  password: string;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

const TABLE_NAME = "powerbi_clients";

export const powerbiClientsService = {
  async list(organizationId?: string): Promise<PowerBIClient[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: true });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as PowerBIClient[];
  },

  async create(payload: Omit<PowerBIClient, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as PowerBIClient;
  },

  async update(id: string, payload: Partial<Omit<PowerBIClient, "id">>) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as PowerBIClient;
  },

  async remove(id: string) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
