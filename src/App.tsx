import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
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
import { LandingThemeProvider } from "@/components/LandingThemeProvider";
import { SuspenseFallback } from "@/components/SuspenseFallback";


const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Auth = React.lazy(() => import("./pages/Auth"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Properties = React.lazy(() => import("./pages/Properties"));
const Pipeline = React.lazy(() => import("./pages/Pipeline"));
const Units = React.lazy(() => import("./pages/Units"));
const Documents = React.lazy(() => import("./pages/Documents"));
const Simulator = React.lazy(() => import("./pages/Simulator"));
const Schedule = React.lazy(() => import("./pages/Schedule"));
const ActivityHistory = React.lazy(() => import("./pages/ActivityHistory"));
const Settings = React.lazy(() => import("./pages/Settings"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Legal = React.lazy(() => import("./pages/Legal"));

const TermsAdmin = React.lazy(() => import("./pages/TermsAdmin"));
const UsersAdmin = React.lazy(() => import("./pages/UsersAdmin"));
const Presentation = React.lazy(() => import("./pages/Presentation"));
const WhatsApp = React.lazy(() => import("./pages/WhatsApp"));
const RealEstate = React.lazy(() => import("./pages/RealEstate"));
const ContactsUnified = React.lazy(() => import("./pages/ContactsUnified"));
const Portals = React.lazy(() => import("./pages/Portals"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Integrations = React.lazy(() => import("./pages/Integrations"));
const Training = React.lazy(() => import("./pages/Training"));
const Rentability = React.lazy(() => import("./pages/Rentability"));
const ProductDemo = React.lazy(() => import("./pages/ProductDemo"));
const Finance = React.lazy(() => import("./pages/Finance"));
const FinanceTransactions = React.lazy(() => import("./pages/FinanceTransactions"));
const FinanceReconciliation = React.lazy(() => import("./pages/FinanceReconciliation"));
const FinanceCategories = React.lazy(() => import("./pages/FinanceCategories"));
const FinanceDRE = React.lazy(() => import("./pages/FinanceDRE"));
const AtivosEmGestao = React.lazy(() => import("./pages/gestao/AtivosEmGestao"));
const AlugueiDetalhe = React.lazy(() => import("./pages/gestao/AlugueiDetalhe"));
const ContratosEmGestao = React.lazy(() => import("./pages/gestao/ContratosEmGestao"));
const ContratoDetalhe = React.lazy(() => import("./pages/gestao/ContratoDetalhe"));
const NovoContrato = React.lazy(() => import("./pages/gestao/NovoContrato"));
const AfazeresEmGestao = React.lazy(() => import("./pages/gestao/AfazeresEmGestao"));
const BoletosEmGestao = React.lazy(() => import("./pages/gestao/BoletosEmGestao"));
const GerencialGestao = React.lazy(() => import("./pages/gestao/GerencialGestao"));
const CheckoutSuccess = React.lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutCancel = React.lazy(() => import("./pages/CheckoutCancel"));
const Checkout = React.lazy(() => import("./pages/Checkout"));
const Users = React.lazy(() => import("./pages/Users"));
const AdminCockpit = React.lazy(() => import("./pages/AdminCockpit"));
const Blog = React.lazy(() => import("./pages/Blog"));
const BlogPostPage = React.lazy(() => import("./pages/BlogPost"));
const AIChat = React.lazy(() => import("./pages/AIChat"));
const Proposals = React.lazy(() => import("./pages/Proposals"));
const AdminApprovals = React.lazy(() => import("./pages/AdminApprovals"));
const DataExport = React.lazy(() => import("./pages/DataExport"));
const AdminDataRequests = React.lazy(() => import("./pages/AdminDataRequests"));
const Plans = React.lazy(() => import("./pages/Plans"));
const Sobre = React.lazy(() => import("./pages/Sobre"));
const NovoEmpreendimento = React.lazy(() => import("./pages/NovoEmpreendimento"));
const NovaUnidade = React.lazy(() => import("./pages/NovaUnidade"));



const queryClient = new QueryClient();

/** Wrap a page element with AuthGuard */
const guarded = (element: React.ReactNode) => <AuthGuard>{element}</AuthGuard>;

/** Renders contract detail when ?id= is present, otherwise the list page */
const ContratosRoute = () => {
  const [searchParams] = useSearchParams();
  return searchParams.get("id") ? <ContratoDetalhe /> : <ContratosEmGestao />;
};

/** Renders asset detail when ?id= is present, otherwise the list page */
const AlugueiRoute = () => {
  const [searchParams] = useSearchParams();
  return searchParams.get("id") ? <AlugueiDetalhe /> : <AtivosEmGestao />;
};

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
            <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/lp/:segment" element={<LandingPage />} />
              <Route path="/demo" element={<ProductDemo />} />
              <Route path="/auth" element={<LandingThemeProvider><Auth /></LandingThemeProvider>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/refund-policy" element={<Navigate to="/legal?tab=refund" replace />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/apresentacao" element={<Presentation />} />
              <Route path="/presentation" element={<Navigate to="/apresentacao" replace />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
             <Route path="/checkout/cancel" element={<CheckoutCancel />} />
             <Route path="/sobre" element={<Sobre />} />
             
             <Route path="/termos-de-uso" element={<Navigate to="/legal?tab=terms" replace />} />
             <Route path="/politica-de-privacidade" element={<Navigate to="/legal?tab=privacy" replace />} />


              {/* Protected routes — wrapped with AuthGuard */}
              <Route path="/dashboard" element={guarded(<Dashboard />)} />
              <Route path="/properties" element={guarded(<Properties />)} />
              <Route path="/properties/novo" element={guarded(<NovoEmpreendimento />)} />
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
              <Route path="/finance/dre" element={guarded(<RequireFeature feature="finance_full"><FinanceDRE /></RequireFeature>)} />
              <Route path="/finance/transactions" element={guarded(<FinanceTransactions />)} />
              <Route path="/finance/reconciliation" element={guarded(<RequireFeature feature="finance_full"><FinanceReconciliation /></RequireFeature>)} />
              <Route path="/finance/categories" element={guarded(<FinanceCategories />)} />
              
              <Route path="/gestao/alugueis" element={guarded(<RequireFeature feature="asset_management"><AlugueiRoute /></RequireFeature>)} />
              <Route path="/gestao/contratos" element={guarded(<RequireFeature feature="asset_management"><ContratosRoute /></RequireFeature>)} />
              <Route path="/gestao/contratos/novo" element={guarded(<RequireFeature feature="asset_management"><NovoContrato /></RequireFeature>)} />
              <Route path="/gestao/afazeres" element={guarded(<RequireFeature feature="asset_management"><AfazeresEmGestao /></RequireFeature>)} />
              <Route path="/gestao/boletos" element={guarded(<RequireFeature feature="asset_management"><BoletosEmGestao /></RequireFeature>)} />
              <Route path="/gestao/gerencial" element={guarded(<RequireFeature feature="asset_management"><GerencialGestao /></RequireFeature>)} />
              <Route path="/gestao/propostas" element={guarded(<Proposals />)} />
              <Route path="/schedule" element={guarded(<Schedule />)} />
              <Route path="/portals" element={guarded(<Portals />)} />
              <Route path="/reports" element={guarded(<RequireFeature feature="reports_overview"><Reports /></RequireFeature>)} />
              <Route path="/integrations" element={guarded(<RequireFeature feature="integrations"><Integrations /></RequireFeature>)} />
              <Route path="/training" element={guarded(<Training />)} />
              <Route path="/users" element={guarded(<Users />)} />
              <Route path="/history" element={guarded(<ActivityHistory />)} />
              <Route path="/settings" element={guarded(<Settings />)} />
              <Route path="/settings/data-export" element={guarded(<DataExport />)} />
              <Route path="/whatsapp" element={guarded(<WhatsApp />)} />
              
              <Route path="/admin/terms" element={guarded(<TermsAdmin />)} />
              <Route path="/admin/users" element={guarded(<UsersAdmin />)} />
              <Route path="/admin/cockpit" element={guarded(<AdminCockpit />)} />
              <Route path="/admin/approvals" element={guarded(<AdminApprovals />)} />
              <Route path="/admin/data-requests" element={guarded(<AdminDataRequests />)} />
              <Route path="/ai-chat" element={guarded(<RequireFeature feature="ai_chat"><AIChat /></RequireFeature>)} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
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
