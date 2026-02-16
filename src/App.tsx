import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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

const queryClient = new QueryClient();

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
                <ProtectedRoute allowedRoles={["admin_master"]}>
                  <DashboardManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute allowedRoles={["admin_master"]}>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin_master"]}>
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
