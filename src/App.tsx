import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { ModernHeader } from "@/components/ModernHeader";
import { ReportBugButton } from "@/components/ReportBugButton";
import Users from "./pages/Users";
import ModernWelcome from "./pages/ModernWelcome";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PowerBIEmbedPage from "./pages/Powerbiembed";
import DashboardManagement from "./pages/DashboardManagement";
import TVPresentations from "./pages/TVPresentations";
import TVPresentationViewer from "./pages/TVPresentationViewer";
import TVPublished from "./pages/TVPublished";
import Clients from "./pages/Clients";
import Organizations from "./pages/Organizations";
import { useEffect } from "react";

const queryClient = new QueryClient();

const OrganizationTheme = () => {
  const { organization } = useAuth();

  useEffect(() => {
    if (organization?.primary_color) {
      const hex = organization.primary_color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      const r_norm = r / 255;
      const g_norm = g / 255;
      const b_norm = b / 255;

      const max = Math.max(r_norm, g_norm, b_norm);
      const min = Math.min(r_norm, g_norm, b_norm);
      
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r_norm: h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0); break;
          case g_norm: h = (b_norm - r_norm) / d + 2; break;
          case b_norm: h = (r_norm - g_norm) / d + 4; break;
        }
        h /= 6;
      }

      const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
      
      const contrast = (r * 299 + g * 587 + b * 114) / 1000;
      const foreground = contrast >= 128 ? '0 0% 0%' : '0 0% 100%';
      document.documentElement.style.setProperty('--primary-foreground', foreground);
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--primary-foreground');
      document.documentElement.style.removeProperty('--ring');
    }
  }, [organization]);

  return null;
};

const AppLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isTVViewerPage = location.pathname.startsWith("/tv-viewer");

  if (isAuthPage || isTVViewerPage) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/tv-viewer/:id"
          element={
            <ProtectedRoute allowedRoles={["admin_master", "admin", "user"]}>
              <TVPresentationViewer />
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  return (
    <>
      <OrganizationTheme />
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <ModernHeader />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={["admin_master", "admin", "user"]}>
                    <ModernWelcome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard-management"
                element={
                  <ProtectedRoute allowedRoles={["admin_master", "admin"]}>
                    <DashboardManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={["admin_master", "admin"]}>
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizations"
                element={
                  <ProtectedRoute allowedRoles={["admin_master", "admin"]}>
                    <Organizations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={["admin_master", "admin"]}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/powerbi"
                element={
                  <ProtectedRoute allowedRoles={["admin_master", "admin", "user"]}>
                    <PowerBIEmbedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tv-presentations"
                element={
                  <ProtectedRoute allowedRoles={["admin_master"]}>
                    <TVPresentations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tv-published"
                element={
                  <ProtectedRoute allowedRoles={["admin_master", "admin"]}>
                    <TVPublished />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <ReportBugButton />
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
