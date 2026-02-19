
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Report, getReportPages, ReportPage } from "@/services/powerBiApiService";
import { UserProfile } from "@/services/userService";
import { MultiSelect, OptionType } from "@/components/MultiSelect";
import { getDashboardPagePermissions, updatePagePermissions } from "@/services/dashboardPagePermissionsService";
import { toast } from "sonner";

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
          <DialogTitle>Permissões por Aba: {report.name}</DialogTitle>
          <DialogDescription>
            Defina quais usuários podem ver cada aba deste relatório.
            <br />
            <span className="text-xs text-muted-foreground">
              Se um usuário tiver permissão explícita em <strong>qualquer</strong> aba deste relatório, ele só verá as abas permitidas.
              <br/>
              Se um usuário <strong>não tiver nenhuma</strong> permissão configurada aqui, ele verá <strong>todas</strong> as abas.
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
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
      </DialogContent>
    </Dialog>
  );
}
