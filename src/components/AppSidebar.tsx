import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  BarChart3,
  Users,
  Building2,
  Tv,
  Settings,
  LayoutDashboard,
  LogOut,
  User,
  Lock,
  Shield,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

export function AppSidebar() {
  const { user, signOut, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const isAdminMaster = userRole === "admin_master";
  const isAdmin = userRole === "admin";
  const canAccessAdminFeatures = isAdminMaster || isAdmin;

  const mainMenuItems = [
    {
      title: "Início",
      icon: Home,
      path: "/",
      roles: ["admin_master", "admin", "user"],
    },
    {
      title: "Power BI",
      icon: BarChart3,
      path: "/powerbi",
      roles: ["admin_master", "admin", "user"],
    },
    {
      title: "TV Dashboards",
      icon: Tv,
      path: "/tv-published",
      roles: ["admin_master", "admin"],
    },
  ];

  const adminMenuItems = [
    {
      title: "Gerenciar Dashboards",
      icon: LayoutDashboard,
      path: "/dashboard-management",
      roles: ["admin_master"],
    },
    {
      title: "Gestão TV",
      icon: Settings,
      path: "/tv-presentations",
      roles: ["admin_master"],
    },
    {
      title: "Usuários",
      icon: Users,
      path: "/users",
      roles: ["admin_master"],
    },
    {
      title: "Clientes Power BI",
      icon: Building2,
      path: "/clients",
      roles: ["admin_master"],
    },
  ];

  const filteredMainItems = mainMenuItems.filter((item) =>
    item.roles.includes(userRole || "")
  );

  const filteredAdminItems = adminMenuItems.filter((item) =>
    item.roles.includes(userRole || "")
  );

  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getRoleBadge = () => {
    if (userRole === "admin_master") {
      return (
        <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px] h-5">
          <Shield className="w-2.5 h-2.5 mr-1" />
          Admin Master
        </Badge>
      );
    }
    if (userRole === "admin") {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] h-5">
          <Shield className="w-2.5 h-2.5 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] h-5">
        <User className="w-2.5 h-2.5 mr-1" />
        Usuário
      </Badge>
    );
  };

  return (
    <>
      <Sidebar className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarHeader className="border-b border-border/40 p-4">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <img
              src={(import.meta.env.VITE_BRAND_LOGO_URL as string) || "https://xatiqvtpqoipofqretoe.supabase.co/storage/v1/object/public/Gerais/logo_ddi.png"}
              alt="Hub - DDInsights"
              className="h-10 w-auto object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-gradient-cyan">
                Hub DDInsights
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Business Intelligence
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Menu Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={location.pathname === item.path}
                      className="w-full justify-start gap-3 px-3 py-2.5 hover:bg-primary/10 hover:text-primary transition-colors data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {filteredAdminItems.length > 0 && (
            <>
              <SidebarSeparator className="my-4" />
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  Administração
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredAdminItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.path)}
                          isActive={location.pathname === item.path}
                          className="w-full justify-start gap-3 px-3 py-2.5 hover:bg-primary/10 hover:text-primary transition-colors data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium"
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-border/40 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <div className="mt-0.5">{getRoleBadge()}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card border-primary/30">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Minha Conta</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="cursor-pointer"
              >
                <Lock className="w-4 h-4 mr-2" />
                Alterar Senha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <ChangePasswordModal
        open={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
      />
    </>
  );
}
