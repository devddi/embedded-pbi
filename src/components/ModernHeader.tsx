import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Home,
  BarChart3,
  Users,
  Building2,
  Tv,
  Settings,
  LayoutDashboard,
} from "lucide-react";

export const ModernHeader = () => {
  const location = useLocation();

  const getPageInfo = () => {
    const path = location.pathname;
    
    const pageMap: Record<string, { title: string; icon: typeof Home }> = {
      "/": { title: "Início", icon: Home },
      "/powerbi": { title: "Power BI", icon: BarChart3 },
      "/users": { title: "Gerenciar Usuários", icon: Users },
      "/clients": { title: "Clientes Power BI", icon: Building2 },
      "/tv-published": { title: "TV Dashboards", icon: Tv },
      "/tv-presentations": { title: "Gestão TV", icon: Settings },
      "/dashboard-management": { title: "Gerenciar Dashboards", icon: LayoutDashboard },
    };

    return pageMap[path] || { title: "Hub DDInsights", icon: Home };
  };

  const { title, icon: Icon } = getPageInfo();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium">{title}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
};
