import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Users, Menu, Home, Lock, BarChart3, ChevronDown, Shield, Tv, Settings, LayoutDashboard, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
}

export const Header = () => {
  const { user, signOut, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Helper booleans for role checks
  const isAdminMaster = userRole === "admin_master";
  const isAdmin = userRole === "admin";
  const isRegularUser = userRole === "user";

  // Combine roles for easier checks
  const canAccessAdminFeatures = isAdminMaster || isAdmin;
  const canAccessPowerBIAndIA = isAdminMaster || isAdmin || isRegularUser;

  // Função para obter o nome da página atual
  const getCurrentPageName = () => {
    if (location.pathname === '/') return 'Início';
    if (location.pathname === '/users') return 'Usuários';
    if (location.pathname === '/tv-presentations') return 'Gestão TV';
    if (location.pathname === '/tv-published') return 'TV Dashboards';
    if (location.pathname === '/powerbi') return 'Power BI';
    if (location.pathname === '/dashboard-management') return 'Gerenciar Dashboards';
    return 'Início';
  };

  const getCurrentPageIcon = () => {
    if (location.pathname === '/') return Home;
    if (location.pathname === '/users') return Users;
    if (location.pathname === '/tv-presentations' || location.pathname === '/tv-published') return Tv;
    if (location.pathname === '/powerbi') return BarChart3;
    if (location.pathname === '/dashboard-management') return BarChart3;
    return Home;
  };

  const loadUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user, loadUserProfile]);



  const getDisplayName = () => {
    if (userProfile?.first_name || userProfile?.last_name) {
      return `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim();
    }
    return user?.email || "Usuário";
  };

  const getRoleBadge = () => {
    if (userRole === "admin_master") {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] py-0 h-4">
          <Shield className="w-2 h-2 mr-1" />
          Admin Master
        </Badge>
      );
    }
    if (userRole === "admin") {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] py-0 h-4">
          <Shield className="w-2 h-2 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] py-0 h-4">
        <User className="w-2 h-2 mr-1" />
        Usuário
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-lg md:text-xl font-bold text-gradient-cyan hover:opacity-80 transition-opacity"
          >
            <img
              src={import.meta.env.VITE_BRAND_LOGO_URL as string}
              alt="Hub - Eurostock Logo"
              className="w-10 h-10 object-cover object-center"
            />
            <span className="truncate">
              Hub - Eurostock
            </span>
          </button>
          
          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Dropdown de Navegação */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="glass border-primary/30 hover:border-primary/50 hover:bg-primary/5 hover:text-white"
                >
                  {(() => {
                    const IconComponent = getCurrentPageIcon();
                    return <IconComponent className="w-4 h-4 mr-2" />;
                  })()}
                  {getCurrentPageName()}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Navegar para</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Home className="w-4 h-4 mr-2" />
                  Início
                </DropdownMenuItem>
                {canAccessPowerBIAndIA && (
                  <DropdownMenuItem onClick={() => navigate('/powerbi')}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Power BI
                  </DropdownMenuItem>
                )}
                {(isAdminMaster || isAdmin) && (
                  <DropdownMenuItem onClick={() => navigate('/tv-published')}>
                    <Tv className="w-4 h-4 mr-2" />
                    TV Dashboards
                  </DropdownMenuItem>
                )}
                {isAdminMaster && (
                  <DropdownMenuItem onClick={() => navigate('/tv-presentations')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Gestão TV
                  </DropdownMenuItem>
                )}

              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="glass border-primary/30 hover:border-primary/50 hover:bg-primary/5 hover:text-white text-white"
                >
                  <User className="w-4 h-4 mr-2" />
                  {getDisplayName()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-card border-primary/30 min-w-[250px]" align="end">
                {/* User welcome section */}
                <div className="p-4 text-center border-b border-border">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1 flex flex-col items-center">
                    <p className="text-sm font-medium">👋 Bem-vindo!</p>
                    <p className="text-sm font-semibold text-primary">{getDisplayName()}</p>
                    {getRoleBadge()}
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                
                <div className="p-1">
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                    Ações
                  </DropdownMenuLabel>

                  {isAdminMaster && (
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard-management")}
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Gerenciar Dashboards
                    </DropdownMenuItem>
                  )}
                  {isAdminMaster && (
                    <DropdownMenuItem
                      onClick={() => navigate("/users")}
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Gerenciar Usuários
                    </DropdownMenuItem>
                  )}
                  {isAdminMaster && (
                    <DropdownMenuItem
                      onClick={() => navigate("/clients")}
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Clientes Power BI
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setIsChangePasswordModalOpen(true)}
                    className="cursor-pointer hover:bg-primary/10"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="glass">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-card">
                <SheetHeader>
                  <SheetTitle>Navegação</SheetTitle>
                </SheetHeader>
                
                {/* User welcome section */}
                <div className="mt-6 mb-6 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="text-sm flex flex-col items-center">
                    <div className="text-lg mb-1">👋 Bem-vindo!</div>
                    <div className="font-medium text-foreground">{getDisplayName()}</div>
                    <div className="mt-1">{getRoleBadge()}</div>
                    <div className="text-xs text-muted-foreground mt-1">{user?.email}</div>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate("/")}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Início
                  </Button>

                  {isAdminMaster && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => navigate('/dashboard-management')}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Gerenciar Dashboards
                    </Button>
                  )}
                  {isAdminMaster && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => navigate('/users')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Gerenciar Usuários
                    </Button>
                  )}
                  {canAccessPowerBIAndIA && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => navigate('/powerbi')}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Power BI
                    </Button>
                  )}
                  {(isAdminMaster || isAdmin) && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => navigate('/tv-published')}
                    >
                      <Tv className="w-4 h-4 mr-2" />
                      TV Dashboards
                    </Button>
                  )}
                  {isAdminMaster && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => navigate('/tv-presentations')}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Gestão TV
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => setIsChangePasswordModalOpen(true)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-destructive hover:text-destructive"
                    onClick={signOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <ChangePasswordModal
        open={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
      />
    </>
  );
};
