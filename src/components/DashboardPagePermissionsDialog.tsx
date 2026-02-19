
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Report, getReportPages, ReportPage } from "@/services/powerBiApiService";
import { UserProfile } from "@/services/userService";
import { MultiSelect, OptionType } from "@/components/MultiSelect";
import { getDashboardPagePermissions, updatePagePermissions } from "@/services/dashboardPagePermissionsService";
import { getUserDashboardSettings, upsertUserDashboardSetting } from "@/services/dashboardUserSettingsService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface DashboardPagePermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  clientId?: string;
  users: UserProfile[];
}

export function DashboardPagePermissionsDialog({
  isOpen,
  onClose,
  report,
  clientId,
  users
}: DashboardPagePermissionsDialogProps) {
  const [pages, setPages] = useState<ReportPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagePermissions, setPagePermissions] = useState<Record<string, string[]>>({}); // pageName -> userIds[]
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  
  // RLS States
  const [selectedUserForRLS, setSelectedUserForRLS] = useState<string>("");
  const [rlsRole, setRlsRole] = useState<string>("User");
  const [savingRLS, setSavingRLS] = useState(false);

  useEffect(() => {
    if (isOpen && report) {
      loadData();
    }
  }, [isOpen, report]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pages from Power BI
      const fetchedPages = await getReportPages(report.workspaceId, report.id, clientId);
      setPages(fetchedPages);

      // 2. Fetch existing permissions from Supabase
      const permissions = await getDashboardPagePermissions(report.id);
      
      // Group permissions by page
      const permissionsMap: Record<string, string[]> = {};
      permissions.forEach(p => {
        if (!permissionsMap[p.page_name]) {
          permissionsMap[p.page_name] = [];
        }
        permissionsMap[p.page_name].push(p.user_id);
      });
      
      setPagePermissions(permissionsMap);

    } catch (e) {
      console.error("Erro ao carregar dados de páginas:", e);
      toast.error("Erro ao carregar páginas do relatório");
    } finally {
      setLoading(false);
    }
  };
  
  const handleUserSelectForRLS = async (userId: string) => {
    setSelectedUserForRLS(userId);
    setLoading(true);
    try {
        const setting = await getUserDashboardSettings(report.id, userId);
        setRlsRole(setting?.rls_role || "User");
    } catch (e) {
        console.error("Erro ao carregar RLS user setting", e);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveRLS = async () => {
    if (!selectedUserForRLS) return;
    setSavingRLS(true);
    try {
        await upsertUserDashboardSetting({
            dashboard_id: report.id,
            user_id: selectedUserForRLS,
            rls_role: rlsRole
        });
        toast.success("Role RLS salva com sucesso!");
    } catch (e) {
        toast.error("Erro ao salvar role RLS");
    } finally {
        setSavingRLS(false);
    }
  };

  const handlePermissionChange = async (pageName: string, pageDisplayName: string, selectedUserIds: string[]) => {
    setSaving(prev => ({ ...prev, [pageName]: true }));
    try {
      await updatePagePermissions(report.id, pageName, pageDisplayName, selectedUserIds);
      
      setPagePermissions(prev => ({
        ...prev,
        [pageName]: selectedUserIds
      }));
      
      toast.success(`Permissões atualizadas para a página ${pageDisplayName}`);
    } catch (e) {
      console.error("Erro ao salvar permissões:", e);
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(prev => ({ ...prev, [pageName]: false }));
    }
  };

  const userOptions: OptionType[] = users.map(user => ({
    label: `${user.first_name} ${user.last_name}`,
    value: user.id,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões Avançadas: {report.name}</DialogTitle>
          <DialogDescription>
            Gerencie o acesso por abas e configurações de RLS por usuário.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pages">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pages">Abas (Páginas)</TabsTrigger>
            <TabsTrigger value="rls">RLS (Roles)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pages" className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Defina quais usuários podem ver cada aba deste relatório. Se um usuário não tiver permissão explícita, ele verá todas as abas.
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {pages.map(page => (
                  <div key={page.name} className="border p-4 rounded-lg bg-muted/20">
                    <div className="mb-2">
                      <h4 className="font-medium text-sm">{page.displayName}</h4>
                      <p className="text-xs text-muted-foreground">ID: {page.name}</p>
                    </div>
                    
                    <div className="relative">
                      {saving[page.name] && (
                        <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                      <Label className="text-xs mb-1.5 block">Usuários com acesso a esta aba</Label>
                      <MultiSelect
                        options={userOptions}
                        selected={pagePermissions[page.name] || []}
                        onChange={(selected) => handlePermissionChange(page.name, page.displayName, selected)}
                        placeholder="Selecione usuários..."
                        showCountOnly={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="rls" className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Configure qual <strong>Role RLS</strong> cada usuário deve assumir ao acessar este dashboard.
              <br/>
              O nome da Role deve ser idêntico ao configurado no Power BI Desktop (ex: "ADM", "User", "Gerente").
            </div>
            
            <div className="grid gap-4 border p-4 rounded-lg">
                <div className="grid gap-2">
                    <Label>Selecione o Usuário</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => handleUserSelectForRLS(e.target.value)}
                        value={selectedUserForRLS}
                    >
                        <option value="">Selecione um usuário...</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.first_name} {user.last_name} ({user.role || 'Sem role'})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedUserForRLS && (
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Role RLS para este usuário</Label>
                        <div className="flex gap-2">
                            <Input 
                                value={rlsRole} 
                                onChange={(e) => setRlsRole(e.target.value)} 
                                placeholder="Ex: ADM, User, Gerente..." 
                            />
                            <Button onClick={handleSaveRLS} disabled={savingRLS}>
                                {savingRLS ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Se não configurado, o sistema usará o padrão definido nas configurações gerais do dashboard (geralmente "User").
                        </p>
                    </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
