import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Wallet, Users, FileText } from 'lucide-react';
import { startOfMonth, subMonths } from 'date-fns';
import { ReportsDateFilter } from '@/components/reports/ReportsDateFilter';
import { ReportsUnitSelector } from '@/components/reports/ReportsUnitSelector';
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
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
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
      <div className="space-y-4 sm:space-y-6">
        {/* Header with description and filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Gere relatórios profissionais em PDF ou exporte dados brutos em CSV.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <ReportsUnitSelector 
              selectedUnitId={selectedUnitId} 
              onUnitChange={setSelectedUnitId} 
            />
            <ReportsDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto p-1 w-auto min-w-full sm:min-w-0 sm:w-full sm:grid sm:grid-cols-4">
              <TabsTrigger 
                value="financeiro" 
                className="flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger 
                value="ativos" 
                className="flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Ativos
              </TabsTrigger>
              <TabsTrigger 
                value="crm" 
                className="flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                CRM
              </TabsTrigger>
              <TabsTrigger 
                value="fiscal" 
                className="flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Fiscal/</span>DIMOB
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab content */}
          <TabsContent value="financeiro" className="mt-4 sm:mt-6">
            <ReportsFinanceSection dateRange={dateRange} userName={userName} selectedUnitId={selectedUnitId} />
          </TabsContent>

          <TabsContent value="ativos" className="mt-4 sm:mt-6">
            <ReportsAssetsSection dateRange={dateRange} userName={userName} selectedUnitId={selectedUnitId} />
          </TabsContent>

          <TabsContent value="crm" className="mt-4 sm:mt-6">
            <ReportsCrmSection dateRange={dateRange} userName={userName} selectedUnitId={selectedUnitId} />
          </TabsContent>

          <TabsContent value="fiscal" className="mt-4 sm:mt-6">
            <ReportsFiscalSection dateRange={dateRange} userName={userName} selectedUnitId={selectedUnitId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
