import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  Users, 
  ShieldCheck,
  Tv,
  Building2,
  LayoutDashboard,
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { Button } from "@/components/ui/button";

export default function ModernWelcome() {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const isAdminMaster = userRole === "admin_master";
  const isAdmin = userRole === "admin";

  const primaryActions = [
    {
      title: "Power BI",
      description: "Acesse relatórios e dashboards analíticos em tempo real.",
      icon: BarChart3,
      path: "/powerbi",
      roles: ["admin_master", "admin", "user"],
      gradient: "from-accent/20 via-accent/10 to-transparent",
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      title: "TV Dashboards",
      description: "Visualize apresentações de dashboards para exibição em monitores.",
      icon: Tv,
      path: "/tv-published",
      roles: ["admin_master", "admin"],
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
  ];

  const adminActions = [
    {
      title: "Gerenciar Dashboards",
      description: "Configure visibilidade e permissões dos dashboards.",
      icon: LayoutDashboard,
      path: "/dashboard-management",
      roles: ["admin_master"],
    },
    {
      title: "Gestão TV",
      description: "Configure apresentações para exibição em TV.",
      icon: Settings,
      path: "/tv-presentations",
      roles: ["admin_master"],
    },
    {
      title: "Usuários",
      description: "Gerencie usuários e suas permissões no sistema.",
      icon: Users,
      path: "/users",
      roles: ["admin_master"],
    },
    {
      title: "Clientes Power BI",
      description: "Configure credenciais de acesso por cliente.",
      icon: Building2,
      path: "/clients",
      roles: ["admin_master"],
    },
  ];

  const filteredPrimaryActions = primaryActions.filter((item) =>
    item.roles.includes(userRole || "")
  );

  const filteredAdminActions = adminActions.filter((item) =>
    item.roles.includes(userRole || "")
  );

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <BackgroundVideo opacity="opacity-20" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Business Intelligence Platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gradient-cyan leading-tight">
            Bem-vindo ao Hub DDInsights
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl">
            Plataforma centralizada para análise de dados, dashboards e gestão de insights de negócios.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPrimaryActions.map((item, index) => (
              <Card
                key={item.path}
                className={cn(
                  "group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur hover:border-primary/40 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-primary/5 animate-slide-up"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(item.path)}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  item.gradient
                )} />
                
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                      item.iconBg
                    )}>
                      <item.icon className={cn("w-7 h-7", item.iconColor)} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <CardDescription className="text-base leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Admin Section */}
        {isAdminMaster && filteredAdminActions.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Ferramentas de Administração
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gerenciamento e configurações do sistema
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredAdminActions.map((item, index) => (
                <Card
                  key={item.path}
                  className="group border-border/40 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-200 cursor-pointer hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${(index + 2) * 100}ms` }}
                  onClick={() => navigate(item.path)}
                >
                  <CardHeader className="pb-3">
                    <div className="p-2.5 rounded-lg bg-muted/50 w-fit mb-3 group-hover:bg-primary/10 transition-colors">
                      <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats or Info Cards (Optional) */}
        <div className="mt-12 p-6 rounded-2xl border border-border/40 bg-card/30 backdrop-blur animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Dica do Sistema</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use a barra lateral esquerda para navegar rapidamente entre as diferentes seções do sistema. 
                Você pode recolher a barra clicando no ícone de menu para obter mais espaço de visualização.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
