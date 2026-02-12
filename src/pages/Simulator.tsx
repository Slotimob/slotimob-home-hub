import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabsList } from '@/components/ui/scrollable-tabs';
import { FinancingCalculator } from '@/components/FinancingCalculator';
import { PropertyComparison } from '@/components/PropertyComparison';
import { TaxCalculator } from '@/components/TaxCalculator';
import { AppLayout } from '@/components/AppLayout';

const Simulator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('financing');

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

  return (
    <AppLayout title="Simulador Financeiro">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollableTabsList>
          <TabsTrigger value="financing">Financiamento</TabsTrigger>
          <TabsTrigger value="taxes">Rentabilidade</TabsTrigger>
          <TabsTrigger value="comparison">Vender vs Alugar</TabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="financing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Financiamento</CardTitle>
              <CardDescription>
                Simule financiamentos SAC e PRICE com memorial de cálculo exportável
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
              <CardTitle>Calculadora de Rentabilidade</CardTitle>
              <CardDescription>
                Analise IPTU proporcional e retorno de investimento imobiliário
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
              <CardTitle>Comparativo: Vender vs Alugar</CardTitle>
              <CardDescription>
                Análise de cenários para decisão patrimonial
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
