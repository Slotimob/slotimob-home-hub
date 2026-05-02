import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { subDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { TermsReacceptDialog } from '@/components/TermsReacceptDialog';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { WelcomeModal } from '@/components/WelcomeModal';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  DashboardDateFilter,
  DashboardCustomizeSheet,
  ShortcutsWidget,
  AssetsWidget,
  FinancialWidget,
  PipelineWidget,
  PortfolioWidget,
  AppointmentsWidget,
  RentReceivablesWidget,
  OpenRentalsWidget,
  DelinquencyWidget,
  DatePreset,
  DateRange,
} from '@/components/dashboard';
import { TrialBanner } from '@/components/dashboard/TrialBanner';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { isOwner, hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { needsReaccept, markAccepted, currentVersion } = useTermsAcceptance(user?.id);
  const { 
    preferences, 
    isLoaded, 
    toggleWidget, 
    toggleShortcut, 
    togglePipelineStage,
    syncPipelineStages,
    resetPreferences,
    getEnabledStagesCount,
    maxPipelineStages,
  } = useDashboardPreferences();

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Always load pipeline stages for the customization menu (even if widget is hidden)
  useEffect(() => {
    const loadPipelineStages = async () => {
      if (!user) return;
      
      try {
        const { data: stages, error } = await supabase
          .from('pipeline_stages')
          .select('id, name, color, display_order')
          .order('display_order', { ascending: true });

        if (error) throw error;
        
        if (stages && stages.length > 0) {
          syncPipelineStages(stages);
        }
      } catch (error) {
        console.error('Error loading pipeline stages:', error);
      }
    };

    if (user && isLoaded) {
      loadPipelineStages();
    }
  }, [user, isLoaded, syncPipelineStages]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  const handlePresetChange = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Terms Re-accept Dialog */}
      {user && needsReaccept && (
        <TermsReacceptDialog
          open={needsReaccept}
          userId={user.id}
          currentVersion={currentVersion}
          onAccepted={markAccepted}
        />
      )}

      {/* Onboarding Welcome Modal */}
      <WelcomeModal />

      <div className="min-h-[100dvh] flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/10 pb-20 md:pb-0">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-4 py-3 pr-[30px]">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                  <SettingsIcon className="h-5 w-5" />
                </Button>
                <Button variant="outline" onClick={signOut} className="h-9 pr-[15px]">
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto px-3 py-6 lg:px-8 lg:py-8">
            {/* Header Section with Title and Customize */}
            <div className="mb-6 lg:mb-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Title Section */}
                <div>
                  <h2 className="mb-1 text-2xl lg:text-3xl font-bold">Dashboard</h2>
                  <p className="text-sm text-muted-foreground">
                    Visão geral do seu negócio imobiliário
                  </p>
                </div>

                {/* Customize Button */}
                {(isOwner || hasPermission('dashboard', 'edit')) && (
                <DashboardCustomizeSheet
                  widgets={preferences.widgets}
                  shortcuts={preferences.shortcuts}
                  pipelineStages={preferences.pipelineStages}
                  onToggleWidget={toggleWidget}
                  onToggleShortcut={toggleShortcut}
                  onTogglePipelineStage={togglePipelineStage}
                  onReset={resetPreferences}
                  enabledStagesCount={getEnabledStagesCount()}
                  maxStages={maxPipelineStages}
                />
                )}
              </div>
            </div>

            {/* Widgets Content */}
            {!isLoaded ? (
              <div className="space-y-4 lg:space-y-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-32" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <Skeleton className="h-80" />
                  <Skeleton className="h-80" />
                </div>
              </div>
            ) : (
              <div className="space-y-6 lg:space-y-8">
                {/* ═══════════════════════════════════════════════════════════════
                    TRIAL BANNER (Free users only)
                   ═══════════════════════════════════════════════════════════════ */}
                <TrialBanner />

                {/* ═══════════════════════════════════════════════════════════════
                    LINHA 1: ACESSOS RÁPIDOS
                   ═══════════════════════════════════════════════════════════════ */}
                {preferences.widgets.shortcuts && (
                  <section>
                    <ShortcutsWidget shortcuts={preferences.shortcuts} />
                  </section>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    LINHA 2: INDICADORES PATRIMONIAIS (Patrimônio | Yield | Vacância)
                   ═══════════════════════════════════════════════════════════════ */}
                <section>
                  <PortfolioWidget refreshKey={refreshKey} />
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    LINHA 3: PATRIMÔNIO (Contagem de Ativos)
                   ═══════════════════════════════════════════════════════════════ */}
                {preferences.widgets.assets && (
                  <section>
                    <AssetsWidget />
                  </section>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    LINHA 3.5: COMPROMISSOS | ALUGUÉIS A RECEBER
                   ═══════════════════════════════════════════════════════════════ */}
                {(preferences.widgets.appointments || preferences.widgets.rent_receivables) && (
                  <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {preferences.widgets.appointments && (
                      <AppointmentsWidget dateRange={dateRange} refreshKey={refreshKey} />
                    )}
                    {preferences.widgets.rent_receivables && (
                      <RentReceivablesWidget dateRange={dateRange} refreshKey={refreshKey} />
                    )}
                  </section>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    LINHA 3.6: INADIMPLÊNCIA | IMÓVEIS COM ALUGUEL EM ABERTO
                   ═══════════════════════════════════════════════════════════════ */}
                {(preferences.widgets.delinquency || preferences.widgets.open_rentals) && (
                  <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {preferences.widgets.delinquency && (
                      <DelinquencyWidget dateRange={dateRange} refreshKey={refreshKey} />
                    )}
                    {preferences.widgets.open_rentals && (
                      <OpenRentalsWidget dateRange={dateRange} refreshKey={refreshKey} />
                    )}
                  </section>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    CONTROLADOR DE PERÍODO (Divisor Visual)
                   ═══════════════════════════════════════════════════════════════ */}
                <section className="py-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">
                        Performance do Período
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Métricas calculadas conforme o período selecionado
                      </p>
                    </div>
                    <DashboardDateFilter
                      dateRange={dateRange}
                      preset={datePreset}
                      onPresetChange={handlePresetChange}
                      onDateRangeChange={handleDateRangeChange}
                      onRefresh={handleRefresh}
                      isRefreshing={isRefreshing}
                    />
                  </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    LINHA 4: FINANCEIRO (Full width com gráfico maior)
                   ═══════════════════════════════════════════════════════════════ */}
                {preferences.widgets.financial && (
                  <section className="w-full">
                    <FinancialWidget
                      dateRange={dateRange}
                      refreshKey={refreshKey}
                    />
                  </section>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    LINHA 5: PIPELINE CRM (Full width)
                   ═══════════════════════════════════════════════════════════════ */}
                {preferences.widgets.pipeline && (
                  <section className="w-full">
                    <PipelineWidget
                      dateRange={dateRange}
                      refreshKey={refreshKey}
                      enabledStages={preferences.pipelineStages}
                      onStagesLoaded={syncPipelineStages}
                    />
                  </section>
                )}
              </div>
            )}

            {/* Footer */}
            <footer className="border-t bg-card/50 py-4 mt-8">
              <div className="text-center">
                <Link
                  to="/legal"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Política de Privacidade e Termos de Uso
                </Link>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </SidebarProvider>
  );
};

export default Dashboard;
