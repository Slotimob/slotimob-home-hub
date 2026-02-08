import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancingCalculator } from '@/components/FinancingCalculator';
import { PropertyComparison } from '@/components/PropertyComparison';
import { TaxCalculator } from '@/components/TaxCalculator';
import { AppLayout } from '@/components/AppLayout';

// Map routes to tab values
const getTabFromPath = (pathname: string): string => {
  if (pathname.includes('/simulator/taxes')) return 'taxes';
  if (pathname.includes('/simulator/comparison')) return 'comparison';
  return 'financing';
};

const Simulator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Sync tab with route
  const activeTab = getTabFromPath(location.pathname);
  
  const handleTabChange = (value: string) => {
    switch (value) {
      case 'taxes':
        navigate('/simulator/taxes');
        break;
      case 'comparison':
        navigate('/simulator/comparison');
        break;
      default:
        navigate('/simulator/financing');
    }
  };

  return (
    <AppLayout title="Simulador Financeiro">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="financing">Financiamento</TabsTrigger>
          <TabsTrigger value="taxes">Taxas e IPTU</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="financing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Financiamento</CardTitle>
              <CardDescription>
                Simule financiamentos SFH e SBPE para seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinancingCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Taxas</CardTitle>
              <CardDescription>
                Calcule IPTU proporcional e taxas de aluguel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo de Imóveis</CardTitle>
              <CardDescription>
                Compare diferentes unidades lado a lado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyComparison />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Simulator;
