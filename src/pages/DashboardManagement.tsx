import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, FileBarChart, Building2, LayoutDashboard, Search, Filter, ShieldCheck, Eye } from "lucide-react";
import { getAllReports, getWorkspaces, Report, Workspace } from "@/services/powerBiApiService";
import { Switch } from "@/components/ui/switch"; // New import
import { Label } from "@/components/ui/label"; // New import
import { MultiSelect, OptionType } from "@/components/MultiSelect"; // New import
import { getAllUsers, UserProfile } from "@/services/userService"; // New import
import { getAllDashboardSettings, upsertDashboardSettings, DashboardSettings } from "@/services/dashboardSettingsService"; // New import
import { toast } from "sonner"; // New import
import { powerbiClientsService, PowerBIClient } from "@/services/powerbiClientsService";
import { DashboardPagePermissionsDialog } from "@/components/DashboardPagePermissionsDialog";

import { organizationService, Organization } from "@/services/organizationService";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input"; // New import

export default function DashboardManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [clients, setClients] = useState<PowerBIClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // Renamed from users
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]); // New state for dropdown
  const [dashboardSettings, setDashboardSettings] = useState<Record<string, DashboardSettings>>({}); 
  const [savingSettings, setSavingSettings] = useState<Record<string, boolean>>({}); 
  const [page, setPage] = useState(1);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedReportForPermissions, setSelectedReportForPermissions] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState(false);
  const [filterRLS, setFilterRLS] = useState(false);
  const pageSize = 9;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [fetchedClients, fetchedUsers, fetchedOrgs] = await Promise.all([
          powerbiClientsService.list(),
          getAllUsers(),
          organizationService.list(),
        ]);

        setClients(fetchedClients);
        setAllUsers(fetchedUsers);
        setOrganizations(fetchedOrgs);
        setFilteredUsers(fetchedUsers); // Default to all

        if (fetchedClients.length === 0) {
          setReports([]);
          setDashboardSettings({});
          return;
        }

        const firstClientId = fetchedClients[0].id as string;
        // Logic to select first client and filter users
        await handleClientSelect(firstClientId, fetchedClients, fetchedUsers);

      } catch (e: unknown) {
        console.error("Erro ao carregar dados:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`Erro ao carregar dados: ${errorMessage}`);
        toast.error(`Erro ao carregar dados: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClientSelect = async (clientId: string, currentClients = clients, currentUsers = allUsers) => {
      setSelectedClientId(clientId);
      setSelectedWorkspaceId(null);
      setPage(1);
      
      // Filter users based on client's organization
      const client = currentClients.find(c => c.id === clientId);
      if (client?.organization_id) {
          try {
              const members = await organizationService.listMembers(client.organization_id);
              const memberIds = new Set(members.map(m => m.user_id));
              const filtered = currentUsers.filter(u => memberIds.has(u.id));
              setFilteredUsers(filtered);
          } catch (e) {
              console.error("Error fetching org members", e);
              // Fallback to all users or empty?
              setFilteredUsers(currentUsers); 
          }
      } else {
          setFilteredUsers(currentUsers);
      }

      setLoading(true);
      setError(null);
      try {
        const [clientWorkspaces, clientReports, fetchedSettings] = await Promise.all([
          getWorkspaces(clientId),
          getAllReports(clientId),
          getAllDashboardSettings(),
        ]);

        setWorkspaces(clientWorkspaces);
        setReports(clientReports);

        const firstWorkspaceId = clientWorkspaces[0]?.id ?? null;
        setSelectedWorkspaceId(firstWorkspaceId);

        const clientSettings: Record<string, DashboardSettings> = {};
        clientReports.forEach(report => {
          const existingSetting = fetchedSettings.find(s => s.dashboard_id === report.id);
          // Se existir, usa o organization_id que já estava salvo.
          // Se não, usa o organization_id do Cliente Power BI como default
          const defaultOrgId = existingSetting?.organization_id || client?.organization_id || undefined;

          clientSettings[report.id] = existingSetting || {
            dashboard_id: report.id,
            is_visible: false,
            assigned_users: [],
            organization_id: defaultOrgId,
            enable_rls: false,
            rls_role: "User",
          };
          // Se existir mas não tiver organization_id, preenche com o default (migração suave na UI)
          if (clientSettings[report.id] && !clientSettings[report.id].organization_id) {
             clientSettings[report.id].organization_id = defaultOrgId;
          }
        });
        setDashboardSettings(clientSettings);
      } catch (e: unknown) {
        console.error("Erro ao carregar dados do cliente:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`Erro ao carregar dados do cliente: ${errorMessage}`);
        toast.error(`Erro ao carregar dados do cliente: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
  };

  const userOptions: OptionType[] = filteredUsers.map(user => ({
    label: `${user.first_name} ${user.last_name}`,
    value: user.id,
  }));

  const handleSettingChange = async (
    dashboardId: string,
    key: keyof DashboardSettings,
    value: any
  ) => {
    setSavingSettings(prev => ({ ...prev, [dashboardId]: true }));
    const currentSettings = dashboardSettings[dashboardId];
    
    // Se o usuário estiver alterando o organization_id, usamos o valor passado.
    // Se não, tentamos manter o que já existe ou, em último caso, usar o do cliente (fallback)
    let organizationId = currentSettings?.organization_id;

    if (key === "organization_id") {
      organizationId = value;
    } else if (!organizationId) {
       // Se não tem org definida ainda, tenta pegar do cliente
       const currentClient = clients.find(c => c.id === selectedClientId);
       organizationId = currentClient?.organization_id || undefined;
    }

    const updatedSettings = { 
      ...currentSettings, 
      [key]: value,
      organization_id: organizationId 
    };

    setDashboardSettings(prev => ({
      ...prev,
      [dashboardId]: updatedSettings,
    }));

    try {
      await upsertDashboardSettings(updatedSettings);
      toast.success("Configurações salvas com sucesso!");
    } catch (e: unknown) {
      console.error("Erro ao salvar configurações:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error(`Erro ao salvar configurações: ${errorMessage}`);
      // Revert to previous state if save fails
      setDashboardSettings(prev => ({
        ...prev,
        [dashboardId]: currentSettings,
      }));
    } finally {
      setSavingSettings(prev => ({ ...prev, [dashboardId]: false }));
    }
  };

  const filteredReports = reports
    .filter(report => selectedWorkspaceId ? report.workspaceId === selectedWorkspaceId : true)
    .filter(report => {
      // 1. Filtro de Texto (Nome do Dash)
      if (searchTerm && !report.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      const settings = dashboardSettings[report.id];
      
      // 2. Filtro "Ativos" (is_visible)
      if (filterActive && !settings?.is_visible) {
        return false;
      }

      // 3. Filtro "RLS Configurado"
      if (filterRLS && !settings?.enable_rls) {
        return false;
      }

      return true;
    });

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Gerenciar Dashboards</h1>
          <p className="text-muted-foreground">Configuração de Dashboards Power BI por Cliente</p>
        </div>

        {/* Filtros */}
        <div className="bg-muted/30 p-4 rounded-lg border mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar dashboard por nome..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center space-x-2 bg-background border rounded-md px-3 py-2">
              <Eye className={`h-4 w-4 ${filterActive ? "text-primary" : "text-muted-foreground"}`} />
              <Label htmlFor="filter-active" className="cursor-pointer text-sm font-medium">Ativos</Label>
              <Switch 
                id="filter-active" 
                checked={filterActive}
                onCheckedChange={setFilterActive}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center space-x-2 bg-background border rounded-md px-3 py-2">
              <ShieldCheck className={`h-4 w-4 ${filterRLS ? "text-primary" : "text-muted-foreground"}`} />
              <Label htmlFor="filter-rls" className="cursor-pointer text-sm font-medium">Com RLS</Label>
              <Switch 
                id="filter-rls" 
                checked={filterRLS}
                onCheckedChange={setFilterRLS}
                className="scale-75"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 mb-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Clientes Power BI
              </CardTitle>
              <CardDescription>
                Selecione um cliente para ver seus workspaces e relatórios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum cliente Power BI cadastrado. Cadastre em &quot;Clientes&quot; primeiro.
                </p>
              )}
              {clients.length > 0 && (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client.id!)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                        selectedClientId === client.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{client.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                Workspaces do Cliente
              </CardTitle>
              <CardDescription>
                Escolha um workspace para visualizar e configurar seus relatórios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedClientId == null && (
                <p className="text-sm text-muted-foreground">
                  Selecione um cliente para carregar os workspaces.
                </p>
              )}
              {selectedClientId != null && workspaces.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum workspace encontrado para este cliente.
                </p>
              )}
              {selectedClientId != null && workspaces.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                      className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition-colors ${
                        selectedWorkspaceId === workspace.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {workspace.name}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Carregando todos os dashboards e relatórios...</p>
            </div>
          </div>
        )}

        {!loading && filteredReports.length === 0 && !error && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Nenhum dashboard ou relatório encontrado para o cliente e workspace selecionados.
          </div>
        )}

        {!loading && filteredReports.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Mostrando{" "}
                {Math.min((page - 1) * pageSize + 1, filteredReports.length)}-
                {Math.min(page * pageSize, filteredReports.length)} de {filteredReports.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPage((p) =>
                      p * pageSize >= filteredReports.length ? p : p + 1
                    )
                  }
                  disabled={page * pageSize >= filteredReports.length}
                >
                  Próxima
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports
              .slice((page - 1) * pageSize, page * pageSize)
              .map((report) => {
              const settings = dashboardSettings[report.id];
              const isSaving = savingSettings[report.id];

              return (
                <Card
                  key={report.id}
                  className="hover:border-primary transition-all hover:shadow-md group relative"
                >
                  {isSaving && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <FileBarChart className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="mt-4">{report.name}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      Workspace: {report.workspaceName || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`visibility-${report.id}`}>Visível</Label>
                      <Switch
                        id={`visibility-${report.id}`}
                        checked={settings?.is_visible ?? false}
                        onCheckedChange={(checked) =>
                          handleSettingChange(report.id, "is_visible", checked)
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t pt-4 mt-4">
                      <div className="space-y-0.5">
                        <Label htmlFor={`rls-${report.id}`}>Habilitar RLS</Label>
                        <p className="text-xs text-muted-foreground">Row Level Security</p>
                      </div>
                      <Switch
                        id={`rls-${report.id}`}
                        checked={settings?.enable_rls ?? false}
                        onCheckedChange={(checked) =>
                          handleSettingChange(report.id, "enable_rls", checked)
                        }
                        disabled={isSaving}
                      />
                    </div>

                    {settings?.enable_rls && (
                      <div className="animate-in fade-in slide-in-from-top-1">
                        <Label htmlFor={`rls-role-${report.id}`} className="mb-2 block">
                          Role RLS
                        </Label>
                        <Input
                          id={`rls-role-${report.id}`}
                          value={settings?.rls_role || "User"}
                          onChange={(e) => handleSettingChange(report.id, "rls_role", e.target.value)}
                          placeholder="Ex: User"
                          disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Nome da role definida no Power BI Desktop.
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="mb-2 block">Controle de Abas</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedReportForPermissions(report)}
                      >
                        Gerenciar Permissões de Abas
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor={`org-${report.id}`} className="mb-2 block">
                        Organização
                      </Label>
                      <Select
                        value={settings?.organization_id || ""}
                        onValueChange={(value) => handleSettingChange(report.id, "organization_id", value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a organização" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`assigned-users-${report.id}`} className="mb-2 block">
                        Atribuir Usuários
                      </Label>
                      <MultiSelect
                        options={userOptions}
                        selected={settings?.assigned_users || []}
                        onChange={(selectedUsers) =>
                          handleSettingChange(report.id, "assigned_users", selectedUsers)
                        }
                        placeholder="Selecione usuários"
                        disabled={isSaving}
                        showCountOnly={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </div>
      
      {selectedReportForPermissions && (
        <DashboardPagePermissionsDialog
          isOpen={!!selectedReportForPermissions}
          onClose={() => setSelectedReportForPermissions(null)}
          report={selectedReportForPermissions}
          clientId={selectedClientId || undefined}
          users={filteredUsers}
        />
      )}
    </PageLayout>
  );
}
