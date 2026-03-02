import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlowInitializer } from "@/components/GlowInitializer";
import { TrackingProvider } from "@/components/TrackingProvider";
import { UtmCaptureProvider } from "@/components/UtmCaptureProvider";
import { SEOProvider } from "@/components/SEOHead";
import { JsonLdSchema } from "@/components/JsonLdSchema";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { RequireFeature } from "@/components/subscription/RequireFeature";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import { LandingThemeProvider } from "@/components/LandingThemeProvider";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
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
import Checkout from "./pages/Checkout";
import Users from "./pages/Users";
import AdminCockpit from "./pages/AdminCockpit";
import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPost";
import AIChat from "./pages/AIChat";

const queryClient = new QueryClient();

/** Wrap a page element with AuthGuard */
const guarded = (element: React.ReactNode) => <AuthGuard>{element}</AuthGuard>;

const App = () => (
  <SEOProvider>
    <JsonLdSchema />
    <PWAUpdatePrompt />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <TrackingProvider>
            <GlowInitializer />
            <UtmCaptureProvider />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/lp/:segment" element={<LandingPage />} />
              <Route path="/demo" element={<ProductDemo />} />
              <Route path="/auth" element={<LandingThemeProvider><Auth /></LandingThemeProvider>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/apresentacao" element={<Presentation />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />

              {/* Protected routes — wrapped with AuthGuard */}
              <Route path="/dashboard" element={guarded(<Dashboard />)} />
              <Route path="/properties" element={guarded(<Properties />)} />
              <Route path="/units" element={guarded(<Units />)} />
              <Route path="/real-estate" element={guarded(<RealEstate />)} />
              <Route path="/pipeline" element={guarded(<Pipeline />)} />
              <Route path="/contacts" element={guarded(<ContactsUnified />)} />
              <Route path="/contacts/owners" element={guarded(<ContactsUnified />)} />
              <Route path="/contacts/leads" element={guarded(<ContactsUnified />)} />
              <Route path="/contacts/companies" element={guarded(<ContactsUnified />)} />
              <Route path="/documents" element={guarded(<Documents />)} />
              <Route path="/documents/templates" element={guarded(<Documents />)} />
              <Route path="/documents/custom" element={guarded(<Documents />)} />
              <Route path="/documents/history" element={guarded(<Documents />)} />
              <Route path="/simulator" element={guarded(<Simulator />)} />
              <Route path="/simulator/financing" element={guarded(<Simulator />)} />
              <Route path="/simulator/taxes" element={guarded(<Simulator />)} />
              <Route path="/simulator/comparison" element={guarded(<Simulator />)} />
              <Route path="/rentability" element={guarded(<Rentability />)} />
              <Route path="/rentability/yield" element={guarded(<Rentability />)} />
              <Route path="/rentability/payback" element={guarded(<Rentability />)} />
              <Route path="/rentability/comparison" element={guarded(<Rentability />)} />
              <Route path="/finance" element={guarded(<Finance />)} />
              <Route path="/finance/dre" element={guarded(<FinanceDRE />)} />
              <Route path="/finance/transactions" element={guarded(<FinanceTransactions />)} />
              <Route path="/finance/reconciliation" element={guarded(<FinanceReconciliation />)} />
              <Route path="/finance/categories" element={guarded(<FinanceCategories />)} />
              <Route path="/asset-health" element={guarded(<AssetHealth />)} />
              <Route path="/schedule" element={guarded(<Schedule />)} />
              <Route path="/portals" element={guarded(<Portals />)} />
              <Route path="/reports" element={guarded(<Reports />)} />
              <Route path="/integrations" element={guarded(<RequireFeature feature="integrations"><Integrations /></RequireFeature>)} />
              <Route path="/training" element={guarded(<Training />)} />
              <Route path="/users" element={guarded(<Users />)} />
              <Route path="/history" element={guarded(<ActivityHistory />)} />
              <Route path="/settings" element={guarded(<Settings />)} />
              <Route path="/whatsapp" element={guarded(<WhatsApp />)} />
              
              <Route path="/admin/terms" element={guarded(<TermsAdmin />)} />
              <Route path="/admin/users" element={guarded(<UsersAdmin />)} />
              <Route path="/admin/cockpit" element={guarded(<AdminCockpit />)} />
              <Route path="/ai-chat" element={guarded(<RequireFeature feature="ai_chat"><AIChat /></RequireFeature>)} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </TrackingProvider>
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  </SEOProvider>
);

export default App;
