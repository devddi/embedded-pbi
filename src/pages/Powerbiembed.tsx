import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, LayoutDashboard, FileBarChart, ArrowLeft, Maximize, Minimize, RefreshCw } from "lucide-react";
import { PowerBIEmbed } from "powerbi-client-react";
import { models } from "powerbi-client";
import { getAllDashboardSettings, DashboardSettings } from "@/services/dashboardSettingsService";
import { getUserDashboardSettings } from "@/services/dashboardUserSettingsService";
import { getWorkspaces, getReportsInWorkspace, getEmbedToken, getReportPages, Workspace, Report, ReportPage } from "@/services/powerBiApiService";
import { powerbiClientsService, PowerBIClient } from "@/services/powerbiClientsService"; // Import service
import { getUserAllowedPages } from "@/services/dashboardPagePermissionsService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { organizationService } from "@/services/organizationService"; // Import organization service

import { toast } from "sonner"; // New import

export default function PowerBIEmbedPage() {
  const { user, userRole } = useAuth();
  // Estados de navegação
  const [view, setView] = useState<"workspaces" | "reports" | "embed">("workspaces");
  
  // Estados de dados
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [allSettings, setAllSettings] = useState<DashboardSettings[]>([]); // New state to store settings
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  
  // Estados para Multi-Client (Admin Master e Admin de Org)
  const [clients, setClients] = useState<PowerBIClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [canSelectClient, setCanSelectClient] = useState(false);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenHeader, setShowFullscreenHeader] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"fitToPage" | "fitToWidth" | "actualSize">("fitToWidth");
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<any>(null);

  // Estados de navegação de página
  const [reportPages, setReportPages] = useState<ReportPage[]>([]);
  const [allowedPageNames, setAllowedPageNames] = useState<string[] | null>(null);
  const [activePageName, setActivePageName] = useState<string | undefined>(undefined);

  // Selecionar Relatório para Embed
  const handleSelectReport = useCallback(async (report: Report) => {
    if (!currentWorkspace) return;
    
    setLoading(true);
    setStatusMessage("Preparando relatório...");
    setEmbedToken(null); // Clear token to force re-render
    setAllowedPageNames(null);
    setReportPages([]);
    setActivePageName(undefined);
    
    try {
      // 1. Obter Token de Embed
      // Verificar se RLS está habilitado para este report
      const reportSettings = allSettings.find(s => s.dashboard_id === report.id);
      
      let identity = undefined;

      if (reportSettings?.enable_rls && user && user.email) {
        // 1. Tenta buscar configuração específica do usuário
        const userSetting = await getUserDashboardSettings(report.id, user.id);
        
        // 2. Define a role: usa a específica do usuário OU a padrão do dashboard OU "User"
        const roleToUse = userSetting?.rls_role || reportSettings.rls_role || "User";

        identity = {
          username: user.email,
          roles: [roleToUse],
          datasets: report.datasetId ? [report.datasetId] : []
        };
      }

      // Se RLS estiver ativo mas não tivermos datasetId, pode falhar. 
      // O datasetId deve vir no objeto Report. Se não vier, vamos tentar sem, mas logar aviso.
      if (identity && (!identity.datasets || identity.datasets.length === 0)) {
         console.warn("RLS habilitado mas datasetId não encontrado no relatório. Token pode falhar ou não aplicar RLS.");
      }

      const tokenPromise = getEmbedToken(currentWorkspace.id, report.id, selectedClientId || undefined, identity);
      
      // 2. Obter Permissões de Página do Usuário (se logado)
      const permissionsPromise = user ? getUserAllowedPages(report.id, user.id) : Promise.resolve(null);

      // 3. Obter todas as páginas do relatório (para montar menu de navegação se necessário)
      const pagesPromise = getReportPages(currentWorkspace.id, report.id, selectedClientId || undefined);

      const [token, permissions, pages] = await Promise.all([tokenPromise, permissionsPromise, pagesPromise]);
      
      setEmbedToken(token);
      setAllowedPageNames(permissions);
      setReportPages(pages);

      // Determinar página inicial
      // Se tiver permissões restritas, pega a primeira permitida.
      // Se não, pega a primeira do relatório (ou deixa undefined para o PowerBI decidir).
      if (permissions && permissions.length > 0) {
        // Verifica se a primeira permissão ainda existe no relatório
        const validPage = pages.find(p => p.name === permissions[0]);
        if (validPage) {
          setActivePageName(validPage.name);
        } else {
           // Fallback para qualquer página válida que esteja na lista de permissões
           const firstValid = pages.find(p => permissions.includes(p.name));
           if (firstValid) setActivePageName(firstValid.name);
        }
      } else if (pages.length > 0) {
        // Se não tem restrição, começa na primeira página (opcional, mas bom para consistência)
        setActivePageName(pages[0].name);
      }

      setCurrentReport(report);
      setView("embed");
    } catch (e: unknown) {
      console.error("Erro ao preparar relatório:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Erro ao preparar relatório: ${errorMessage}`);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  }, [currentWorkspace, getEmbedToken, selectedClientId, user]);

  // Handle Refresh
  const handleRefresh = useCallback(async () => {
    if (currentReport) {
      handleSelectReport(currentReport);
    }
  }, [currentReport, handleSelectReport]);

  // Handle View Mode Change
  const handleViewModeChange = useCallback(async (mode: "fitToPage" | "fitToWidth" | "actualSize") => {
    setViewMode(mode);
    
    if (reportRef.current) {
      try {
        let displayOption;
        
        switch (mode) {
          case "fitToPage":
            displayOption = models.DisplayOption.FitToPage;
            break;
          case "fitToWidth":
            displayOption = models.DisplayOption.FitToWidth;
            break;
          case "actualSize":
            displayOption = models.DisplayOption.ActualSize;
            break;
        }
        
        await reportRef.current.updateSettings({
          layoutType: models.LayoutType.Custom,
          customLayout: {
            displayOption: displayOption
          }
        });
        
        console.log(`Modo de visualização alterado para: ${mode}`);
      } catch (e) {
        console.error("Erro ao alterar modo de visualização:", e);
      }
    }
  }, []);

  // Inicializar - Carregar workspaces automaticamente
  useEffect(() => {
    const init = async () => {
      // Admin Master vê TUDO
      if (userRole === "admin_master") {
        setCanSelectClient(true);
        try {
          const clientsList = await powerbiClientsService.list();
          setClients(clientsList);
          
          if (clientsList.length > 0) {
            const firstClient = clientsList[0];
            setSelectedClientId(firstClient.id || null);
            loadWorkspaces(firstClient.id);
          } else {
             loadWorkspaces();
          }
        } catch (e) {
          console.error("Erro ao carregar clientes (admin_master):", e);
          setError("Erro ao carregar lista de clientes Power BI.");
        }
      } 
      // Admin de Organização vê clientes das SUAS organizações
      else if (userRole === "admin" && user) {
        setCanSelectClient(true);
        try {
          // 1. Busca as organizações do usuário
          const myOrgs = await organizationService.getUserOrganizations(user.id);
          
          if (myOrgs.length > 0) {
             // 2. Busca clientes de TODAS as organizações do usuário
             // Como o serviço powerbiClientsService.list() filtra por UMA org por vez, 
             // vamos fazer chamadas paralelas e juntar tudo.
             const clientsPromises = myOrgs.map(org => powerbiClientsService.list(org.id));
             const clientsArrays = await Promise.all(clientsPromises);
             // Flatten array de arrays
             const myClients = clientsArrays.flat();

             // Remove duplicatas se houver (por segurança)
             const uniqueClients = Array.from(new Map(myClients.map(c => [c.id, c])).values());

             setClients(uniqueClients);

             if (uniqueClients.length > 0) {
               const firstClient = uniqueClients[0];
               setSelectedClientId(firstClient.id || null);
               loadWorkspaces(firstClient.id);
             } else {
               // Admin sem clientes PowerBI configurados na sua org
               setError("Nenhum cliente Power BI encontrado para sua organização.");
               setLoading(false);
             }
          } else {
            // Admin sem organização
            setError("Você não está vinculado a nenhuma organização.");
            setLoading(false);
          }
        } catch (e) {
          console.error("Erro ao carregar clientes (admin):", e);
          setError("Erro ao carregar seus dados.");
        }
      }
      else {
        // Usuário normal (não admin): segue fluxo padrão
        setCanSelectClient(false);
        loadWorkspaces();
      }
    };

    init();
  }, [userRole, user]);

  // Carregar relatórios automaticamente do primeiro workspace
  useEffect(() => {
    if (workspaces.length > 0 && view === "workspaces") {
      // Carrega os relatórios do primeiro workspace automaticamente
      loadReports(workspaces[0]);
    }
  }, [workspaces, view]);

  // Listener para fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reaplicar configurações de visualização quando mudar fullscreen ou viewMode
  useEffect(() => {
    if (reportRef.current && view === "embed") {
      const timer = setTimeout(() => {
        handleViewModeChange(viewMode);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, viewMode, view, handleViewModeChange]);

  // Carregar Workspaces
  const loadWorkspaces = async (clientId?: string | null) => {
    console.log("Iniciando carregamento de workspaces...", clientId);
    setLoading(true);
    setError(null);
    setStatusMessage("Carregando workspaces...");
    
    // Atualiza o estado do cliente selecionado se passado
    if (clientId !== undefined) {
      setSelectedClientId(clientId);
    }

    try {
      const data = await getWorkspaces(clientId || undefined);
      console.log("Workspaces carregados:", data.length || 0);
      setWorkspaces(data);
      setView("workspaces");
      setStatusMessage("");
    } catch (e: unknown) {
      console.error("Erro ao carregar workspaces:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Erro ao carregar workspaces: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Carregar Relatórios
  const loadReports = async (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setLoading(true);
    setError(null);
    setStatusMessage(`Carregando relatórios de ${workspace.name}...`);
    
    try {
      const allReports = await getReportsInWorkspace(workspace.id, selectedClientId || undefined);
      
      // Buscar configurações de visibilidade do Supabase
      const settings = await getAllDashboardSettings();
      setAllSettings(settings); // Store settings for later use
      
      // Filtrar relatórios:
      // 1. Deve estar marcado como is_visible = true
      // 2. Se o usuário NÃO for admin_master, ele deve estar na lista assigned_users
      const visibleReports = allReports.filter(report => {
        const reportSetting = settings.find(s => s.dashboard_id === report.id);
        
        // Se não houver configuração ou is_visible for false, ninguém vê
        if (!reportSetting || !reportSetting.is_visible) return false;
        
        // Se for admin_master ou admin, vê tudo que está is_visible
        if (userRole === "admin_master" || userRole === "admin") return true;
        
        // Se for usuário comum, verifica se o ID do usuário está em assigned_users
        // assigned_users na tabela é jsonb, o serviço o tipa como string[]
        const assignedUsers = Array.isArray(reportSetting.assigned_users) 
          ? reportSetting.assigned_users 
          : [];
          
        return user && assignedUsers.includes(user.id);
      });
      
      setReports(visibleReports);
      setView("reports");
    } catch (e: unknown) {
      console.error("Erro ao carregar relatórios:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Erro ao carregar relatórios: ${errorMessage}`);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // Voltar
  const handleBack = () => {
    if (view === "embed") {
      setView("reports");
      setCurrentReport(null);
      setEmbedToken(null);
      setViewMode("fitToWidth");
      if (isFullscreen) {
        toggleFullscreen();
      }
    } else if (view === "reports") {
      setView("workspaces");
      setCurrentWorkspace(null);
      setReports([]);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!embedContainerRef.current) return;

    if (isFullscreen) {
      setShowFullscreenHeader(false);
    }

    if (!isFullscreen) {
      if (embedContainerRef.current.requestFullscreen) {
        embedContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Monitorar mudanças de página para garantir que o usuário não acesse páginas proibidas
  useEffect(() => {
    // Se não tiver restrições, não precisa monitorar
    if (!allowedPageNames || allowedPageNames.length === 0) return;

    // Função para checar a página atual e reverter se necessário
    const checkPageAccess = async () => {
      if (!reportRef.current) return;

      try {
        // @ts-ignore
        const activePage = await reportRef.current.getActivePage();
        
        if (activePage && !allowedPageNames.includes(activePage.name)) {
          console.warn(`Acesso negado à página ${activePage.displayName} (${activePage.name}). Revertendo...`);
          
          // Tenta voltar para a página ativa permitida (estado) ou a primeira permitida
          const targetPageName = activePageName || allowedPageNames[0];
          
          if (targetPageName) {
            // @ts-ignore
            await reportRef.current.setPage(targetPageName);
            setActivePageName(targetPageName); // Sincroniza estado
          }
        } else if (activePage) {
          // Se a página é permitida, atualiza o estado para refletir a navegação
          setActivePageName(activePage.name);
        }
      } catch (e) {
        console.error("Erro ao verificar acesso à página:", e);
      }
    };

    // Configurar o listener de evento
    // Nota: O PowerBIEmbed component tem uma prop eventHandlers, mas para usar closures atualizados (como allowedPageNames),
    // é mais seguro adicionar o listener diretamente na instância do report quando ela muda ou quando as permissões mudam.
    // Mas como reportRef.current é estável, podemos usar um useEffect.
    
    // Infelizmente a prop eventHandlers do componente PowerBIEmbed só é lida na montagem.
    // Vamos adicionar o listener manualmente.
    
    const report = reportRef.current;
    if (report && allowedPageNames && allowedPageNames.length > 0) {
      // @ts-ignore
      report.off("pageChanged"); // Remove listeners antigos para evitar duplicidade
      // @ts-ignore
      report.on("pageChanged", (event) => {
        // O evento traz a nova página em event.detail.newPage
        const newPage = event.detail.newPage;
        console.log("Mudança de página detectada:", newPage.displayName);
        
        if (!allowedPageNames.includes(newPage.name)) {
          console.warn(`Bloqueando navegação para página não autorizada: ${newPage.displayName}`);
           // Reverte para a página anterior permitida (que deve ser a activePageName atual antes da mudança, ou a primeira permitida)
           const targetPageName = activePageName && allowedPageNames.includes(activePageName) 
             ? activePageName 
             : allowedPageNames[0];
             
           // Exibe toast de aviso
           toast.error("Você não tem permissão para acessar esta página.");
           
           setTimeout(() => {
             // @ts-ignore
             report.setPage(targetPageName).catch(e => console.error("Erro ao reverter página:", e));
           }, 100); // Pequeno delay para garantir que o PowerBI processe a reversão
        } else {
          // Navegação permitida, atualiza estado
          setActivePageName(newPage.name);
        }
      });
    }

    return () => {
      if (report) {
        // @ts-ignore
        report.off("pageChanged");
      }
    };
  }, [allowedPageNames, activePageName, reportRef.current]); // Dependências cruciais

  const visiblePages = reportPages.filter(page => 
    !allowedPageNames || allowedPageNames.includes(page.name)
  );

  return (
    <PageLayout title="Power BI - Sistema Próprio">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header e Navegação */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {view === "embed" && (
              <Button variant="outline" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {view === "workspaces" && "Carregando relatórios..."}
                {view === "reports" && "Selecione um relatório para visualizar"}
                {view === "embed" && `Visualizando: ${currentReport?.name}`}
              </h2>
              <p className="text-muted-foreground">
                {view === "workspaces" && "Aguarde, carregando relatórios disponíveis..."}
                {view === "embed" && "Interaja com seu relatório Power BI"}
              </p>
            </div>
          </div>

          {/* Seletor de Cliente para Admin e Admin Master */}
          {(userRole === "admin_master" || (userRole === "admin" && canSelectClient)) && clients.length > 0 && view !== "embed" && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Cliente:</span>
              <Select
                value={selectedClientId || ""}
                onValueChange={(value) => {
                  setSelectedClientId(value);
                  loadWorkspaces(value);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id || ""}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Mensagens de Status/Erro */}
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
              <p className="text-muted-foreground">{statusMessage}</p>
            </div>
          </div>
        )}

        {/* View: Workspaces */}
        {!loading && view === "workspaces" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhum workspace encontrado.
              </div>
            ) : (
              workspaces.map((ws) => (
                <Card 
                  key={ws.id} 
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
                  onClick={() => loadReports(ws)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <LayoutDashboard className="h-6 w-6 text-blue-500" />
                      </div>
                      {ws.isOnDedicatedCapacity && (
                        <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full border border-amber-200">
                          Premium
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-4">{ws.name}</CardTitle>
                    <CardDescription className="line-clamp-1">ID: {ws.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className={ws.isReadOnly ? "text-orange-500" : "text-green-500"}>
                        {ws.isReadOnly ? "Somente Leitura" : "Acesso Completo"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* View: Reports */}
        {!loading && view === "reports" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhum relatório encontrado neste workspace.
              </div>
            ) : (
              reports.map((report) => (
                <Card 
                  key={report.id} 
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
                  onClick={() => handleSelectReport(report)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <FileBarChart className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="mt-4">{report.name}</CardTitle>
                    <CardDescription className="line-clamp-1">ID: {report.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="link" className="p-0 h-auto text-primary">
                      Visualizar Dashboard &rarr;
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* View: Embed */}
        {!loading && view === "embed" && currentReport && embedToken && (
          <div ref={embedContainerRef} className={isFullscreen ? "fixed inset-0 z-50 bg-[#0a0a0a] group flex items-center justify-center" : ""}>
            <Card className={`overflow-hidden border-2 border-primary/20 shadow-xl ${isFullscreen ? 'w-full h-full rounded-none border-0 bg-transparent' : 'h-[800px]'}`}>
              {/* Trigger area for hover at the top when in fullscreen */}
              {isFullscreen && (
                <div 
                  className="absolute top-0 left-0 right-0 h-4 z-[60] cursor-pointer" 
                  onMouseEnter={() => setShowFullscreenHeader(true)}
                />
              )}

              <div className={`transition-all duration-300 ease-in-out ${
                isFullscreen 
                  ? `absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b shadow-lg ${
                      showFullscreenHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
                    }`
                  : ""
              }`}
               onMouseLeave={() => isFullscreen && !isSelectOpen && setShowFullscreenHeader(false)}
               >
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex flex-col gap-2 max-w-[70%]">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg">{currentReport.name}</CardTitle>
                        <CardDescription>Dashboard Power BI</CardDescription>
                      </div>
                    </div>
                    
                    {visiblePages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-1 no-scrollbar w-full">
                        {visiblePages.map(page => (
                          <Button
                            key={page.name}
                            variant={activePageName === page.name ? "default" : "outline"}
                            size="sm"
                            className="whitespace-nowrap h-7 text-xs px-3 rounded-full"
                            onClick={async () => {
                              setActivePageName(page.name);
                              if (reportRef.current) {
                                try {
                                  // @ts-ignore
                                  await reportRef.current.setPage(page.name);
                                } catch (e) {
                                  console.error("Erro ao mudar página:", e);
                                }
                              }
                            }}
                          >
                            {page.displayName}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4">
                    {/* Refresh Button */}
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleRefresh}
                      title="Atualizar dashboard"
                      disabled={loading}
                    >
                      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>

                    {/* View Mode Selector */}
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      <Select 
                        value={viewMode} 
                        onValueChange={(value) => handleViewModeChange(value as any)}
                        onOpenChange={setIsSelectOpen}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Visualização" />
                        </SelectTrigger>
                        <SelectContent container={embedContainerRef.current || undefined}>
                          <SelectItem value="fitToWidth">Ajustar à largura</SelectItem>
                          <SelectItem value="fitToPage">Ajustar à página</SelectItem>
                          <SelectItem value="actualSize">Tamanho real</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fullscreen Button */}
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </div>
              
              <CardContent 
                 className={`p-0 ${isFullscreen ? 'h-full flex items-center justify-center' : 'h-[calc(100%-73px)]'}`}
                 onMouseEnter={() => isFullscreen && !isSelectOpen && setShowFullscreenHeader(false)}
               >
                <PowerBIEmbed
                  embedConfig={{
                    type: "report",
                    id: currentReport.id,
                    embedUrl: currentReport.embedUrl,
                    accessToken: embedToken,
                    tokenType: models.TokenType.Embed,
                    pageName: activePageName,
                    settings: {
                      panes: {
                        filters: {
                          expanded: false,
                          visible: false
                        },
                        pageNavigation: {
                          visible: false
                        }
                      },
                      background: models.BackgroundType.Default,
                      layoutType: models.LayoutType.Custom,
                      customLayout: {
                        displayOption: models.DisplayOption.FitToWidth
                      }
                    }
                  }}
                  eventHandlers={
                    new Map([
                      ['loaded', function () { 
                        console.log('Relatório carregado'); 
                      }],
                      ['rendered', function () { 
                        console.log('Relatório renderizado'); 
                      }],
                      ['error', function (event) { 
                        console.error('Erro no Power BI:', event?.detail); 
                      }]
                    ])
                  }
                  cssClassName={"h-full w-full border-0 m-0 p-0"}
                  getEmbeddedComponent={(embeddedReport) => {
                    reportRef.current = embeddedReport;
                    // @ts-expect-error - window.report referência para debug se necessário
                    window.report = embeddedReport;
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
