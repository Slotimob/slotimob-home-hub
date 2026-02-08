import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, subMonths } from 'date-fns';
import { Building2, FileText, ShieldAlert, Users, Wallet } from 'lucide-react';

import { AppLayout } from '@/components/AppLayout';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnitSelector } from '@/components/finance/UnitSelector';
import { ReportsAssetsSection } from '@/components/reports/ReportsAssetsSection';
import { ReportsAuditSection } from '@/components/reports/ReportsAuditSection';
import { ReportsCrmSection } from '@/components/reports/ReportsCrmSection';
import { ReportsDateFilter } from '@/components/reports/ReportsDateFilter';
import { ReportsFinanceSection } from '@/components/reports/ReportsFinanceSection';
import { ReportsFiscalSection } from '@/components/reports/ReportsFiscalSection';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Reports = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('financeiro');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: new Date(),
  });
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [userName, setUserName] = useState<string>();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      setUserName(data?.full_name || user.email);
    };
    fetchUserName();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Convert empty string to null for child components
  const unitIdForChildren = selectedUnitId || null;

  return (
    <AppLayout title="Relatórios Gerenciais">
      <div className="space-y-4">
        {/* Description */}
        <p className="text-muted-foreground text-sm">
          Gere relatórios profissionais em PDF ou exporte dados brutos em CSV.
        </p>

        {/* Header: Filters Bar */}
        <div className="rounded-lg border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            
            {/* Filtro: Unidade */}
            <div className="w-full sm:w-auto sm:min-w-[220px] sm:max-w-[280px] space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Unidade
              </Label>
              <UnitSelector
                value={selectedUnitId}
                onChange={setSelectedUnitId}
                placeholder="Todas as unidades"
              />
            </div>

            {/* Filtro: Período */}
            <div className="w-full sm:flex-1 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Período
              </Label>
              <ReportsDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Scrollable tab list for mobile */}
          <div className="w-full overflow-x-auto -mx-1 px-1 pb-1">
            <TabsList className="inline-flex h-auto p-1 w-max min-w-full sm:w-full sm:grid sm:grid-cols-5 gap-1">
              <TabsTrigger
                value="financeiro"
                className="flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Wallet className="h-4 w-4 shrink-0" />
                <span>Financeiro</span>
              </TabsTrigger>
              <TabsTrigger
                value="ativos"
                className="flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Ativos</span>
              </TabsTrigger>
              <TabsTrigger
                value="crm"
                className="flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>CRM</span>
              </TabsTrigger>
              <TabsTrigger
                value="auditoria"
                className="flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Auditoria</span>
              </TabsTrigger>
              <TabsTrigger
                value="fiscal"
                className="flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline">Fiscal/</span>
                DIMOB
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab content */}
          <TabsContent value="financeiro" className="mt-0">
            <ReportsFinanceSection dateRange={dateRange} userName={userName} selectedUnitId={unitIdForChildren} />
          </TabsContent>

          <TabsContent value="ativos" className="mt-0">
            <ReportsAssetsSection dateRange={dateRange} userName={userName} selectedUnitId={unitIdForChildren} />
          </TabsContent>

          <TabsContent value="crm" className="mt-0">
            <ReportsCrmSection dateRange={dateRange} userName={userName} selectedUnitId={unitIdForChildren} />
          </TabsContent>

          <TabsContent value="auditoria" className="mt-0">
            <ReportsAuditSection dateRange={dateRange} userName={userName} selectedUnitId={unitIdForChildren} />
          </TabsContent>

          <TabsContent value="fiscal" className="mt-0">
            <ReportsFiscalSection dateRange={dateRange} userName={userName} selectedUnitId={unitIdForChildren} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
