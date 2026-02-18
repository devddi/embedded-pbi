import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "admin" | "member";
  created_at: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

const TABLE_NAME = "organizations";
const MEMBERS_TABLE = "organization_members";

export const organizationService = {
  /**
   * List organizations visible to the current user.
   */
  async list(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as Organization[];
  },

  /**
   * Get details of a specific organization.
   */
  async get(id: string): Promise<Organization> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Organization;
  },

  /**
   * Create a new organization.
   */
  async create(name: string, ownerId: string, logoUrl?: string, primaryColor?: string): Promise<Organization> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({ name, owner_id: ownerId, logo_url: logoUrl, primary_color: primaryColor })
      .select()
      .single();

    if (error) throw error;
    return data as Organization;
  },

  /**
   * Update an organization.
   */
  async update(id: string, name: string, logoUrl?: string, primaryColor?: string): Promise<Organization> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ name, logo_url: logoUrl, primary_color: primaryColor })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Organization;
  },

  /**
   * Delete an organization.
   */
  async remove(id: string) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * List members of an organization.
   */
  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from(MEMBERS_TABLE)
      .select(`
        *,
        user:profiles(first_name, last_name)
      `)
      .eq("organization_id", organizationId);

    if (error) throw error;
    
    // Transform to flat structure if needed or keep as is.
    // The type definition expects user property.
    return data as unknown as OrganizationMember[];
  },

  /**
   * Add a member to an organization.
   */
  async addMember(organizationId: string, userId: string, role: "admin" | "member") {
    const { data, error } = await supabase
      .from(MEMBERS_TABLE)
      .insert({ organization_id: organizationId, user_id: userId, role })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove a member from an organization.
   */
  async removeMember(organizationId: string, userId: string) {
    const { error } = await supabase
      .from(MEMBERS_TABLE)
      .delete()
      .match({ organization_id: organizationId, user_id: userId });

    if (error) throw error;
  },
  
  /**
   * Get organizations a user belongs to
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
     const { data, error } = await supabase
      .from(MEMBERS_TABLE)
      .select(`
        organization:organizations(*)
      `)
      .eq("user_id", userId);

      if (error) throw error;
      
      return data.map((item: any) => item.organization) as Organization[];
  }
};
