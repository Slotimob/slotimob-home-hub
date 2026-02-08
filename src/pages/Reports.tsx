import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Wallet, Users, FileText, BarChart3 } from 'lucide-react';
import { startOfMonth, subMonths } from 'date-fns';
import { ReportsDateFilter } from '@/components/reports/ReportsDateFilter';
import { ReportsFinanceSection } from '@/components/reports/ReportsFinanceSection';
import { ReportsAssetsSection } from '@/components/reports/ReportsAssetsSection';
import { ReportsCrmSection } from '@/components/reports/ReportsCrmSection';
import { ReportsFiscalSection } from '@/components/reports/ReportsFiscalSection';

const Reports = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('financeiro');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: new Date(),
  });
  const [userName, setUserName] = useState<string>();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setUserName(data?.full_name || user.email);
      }
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

  return (
    <AppLayout title="Intelligence Center">
      <div className="space-y-6">
        {/* Header with description and filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              Gere relatórios profissionais em PDF ou exporte dados brutos em CSV para análise.
            </p>
          </div>
          <ReportsDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1">
            <TabsTrigger 
              value="financeiro" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Financeiro</span>
              <span className="sm:hidden">Fin.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ativos" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Ativos</span>
              <span className="sm:hidden">Ativos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="crm" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4" />
              <span>CRM</span>
            </TabsTrigger>
            <TabsTrigger 
              value="fiscal" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Fiscal/DIMOB</span>
              <span className="sm:hidden">Fiscal</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab content */}
          <TabsContent value="financeiro" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Relatórios Financeiros</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Controle de fluxo de caixa, extratos de repasse, inadimplência e conciliação bancária.
              </p>
              <ReportsFinanceSection dateRange={dateRange} userName={userName} />
            </div>
          </TabsContent>

          <TabsContent value="ativos" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Relatórios de Ativos</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Análise de vacância, projeção de reajustes e controle de seguros do portfólio.
              </p>
              <ReportsAssetsSection dateRange={dateRange} userName={userName} />
            </div>
          </TabsContent>

          <TabsContent value="crm" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Relatórios de CRM</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Performance de conversão, análise de origens de leads e ciclo médio de vendas.
              </p>
              <ReportsCrmSection dateRange={dateRange} userName={userName} />
            </div>
          </TabsContent>

          <TabsContent value="fiscal" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Relatórios Fiscais</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Exportação prévia para DIMOB com validação de dados obrigatórios.
              </p>
              <ReportsFiscalSection dateRange={dateRange} userName={userName} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
