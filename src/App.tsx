import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlowInitializer } from "@/components/GlowInitializer";
import { UtmCaptureProvider } from "@/components/UtmCaptureProvider";
import { SEOProvider } from "@/components/SEOHead";
import { JsonLdSchema } from "@/components/JsonLdSchema";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Properties from "./pages/Properties";
import Pipeline from "./pages/Pipeline";

import Units from "./pages/Units";
import Documents from "./pages/Documents";
import Simulator from "./pages/Simulator";
import Schedule from "./pages/Schedule";

import ActivityHistory from "./pages/ActivityHistory";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import TermsAdmin from "./pages/TermsAdmin";
import UsersAdmin from "./pages/UsersAdmin";
import Presentation from "./pages/Presentation";
import WhatsApp from "./pages/WhatsApp";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import RealEstate from "./pages/RealEstate";
import ContactsUnified from "./pages/ContactsUnified";
import Portals from "./pages/Portals";
import Reports from "./pages/Reports";
import Integrations from "./pages/Integrations";
import Training from "./pages/Training";
import Rentability from "./pages/Rentability";
import ProductDemo from "./pages/ProductDemo";
import Finance from "./pages/Finance";
import FinanceTransactions from "./pages/FinanceTransactions";
import FinanceReconciliation from "./pages/FinanceReconciliation";
import FinanceCategories from "./pages/FinanceCategories";
import FinanceDRE from "./pages/FinanceDRE";
import AssetHealth from "./pages/AssetHealth";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import Users from "./pages/Users";
import AdminCockpit from "./pages/AdminCockpit";
import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPost";
import AIChat from "./pages/AIChat";

const queryClient = new QueryClient();

const App = () => (
  <SEOProvider>
    <JsonLdSchema />
    <PWAUpdatePrompt />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <GlowInitializer />
          <UtmCaptureProvider />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/demo" element={<ProductDemo />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Checkout routes */}
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/units" element={<Units />} />
            <Route path="/real-estate" element={<RealEstate />} />
            <Route path="/pipeline" element={<Pipeline />} />
            {/* Contacts route - single unified page */}
            <Route path="/contacts" element={<ContactsUnified />} />
            {/* Documents routes */}
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/templates" element={<Documents />} />
            <Route path="/documents/custom" element={<Documents />} />
            <Route path="/documents/history" element={<Documents />} />
            {/* Simulator routes */}
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/simulator/financing" element={<Simulator />} />
            <Route path="/simulator/taxes" element={<Simulator />} />
            <Route path="/simulator/comparison" element={<Simulator />} />
            {/* Rentability routes */}
            <Route path="/rentability" element={<Rentability />} />
            <Route path="/rentability/yield" element={<Rentability />} />
            <Route path="/rentability/payback" element={<Rentability />} />
            <Route path="/rentability/comparison" element={<Rentability />} />
            {/* Finance routes */}
            <Route path="/finance" element={<Finance />} />
            <Route path="/finance/dre" element={<FinanceDRE />} />
            <Route path="/finance/transactions" element={<FinanceTransactions />} />
            <Route path="/finance/reconciliation" element={<FinanceReconciliation />} />
            <Route path="/finance/categories" element={<FinanceCategories />} />
            {/* Asset Health route */}
            <Route path="/asset-health" element={<AssetHealth />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/portals" element={<Portals />} />
            {/* Reports route */}
            <Route path="/reports" element={<Reports />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/training" element={<Training />} />
            <Route path="/users" element={<Users />} />
            
            <Route path="/history" element={<ActivityHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/apresentacao" element={<Presentation />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/whatsapp/settings" element={<WhatsAppSettings />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/admin/terms" element={<TermsAdmin />} />
            <Route path="/admin/users" element={<UsersAdmin />} />
            <Route path="/admin/cockpit" element={<AdminCockpit />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  </SEOProvider>
);

export default App;

