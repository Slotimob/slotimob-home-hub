import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/properties" element={<PlaceholderPage />} />
              <Route path="/units" element={<PlaceholderPage />} />
              <Route path="/real-estate" element={<PlaceholderPage />} />
              <Route path="/asset-health" element={<PlaceholderPage />} />
              <Route path="/contacts" element={<PlaceholderPage />} />
              <Route path="/pipeline" element={<PlaceholderPage />} />
              <Route path="/schedule" element={<PlaceholderPage />} />
              <Route path="/finance" element={<PlaceholderPage />} />
              <Route path="/documents" element={<PlaceholderPage />} />
              <Route path="/reports" element={<PlaceholderPage />} />
              <Route path="/settings" element={<PlaceholderPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
