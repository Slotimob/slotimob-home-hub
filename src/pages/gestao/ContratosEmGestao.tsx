import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { ContractsTab } from "@/components/assets/ContractsTab";
import { SEOHead } from "@/components/SEOHead";

const ContratosEmGestao = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  return (
    <>
      <SEOHead
        title="Contratos - Gestão"
        description="Gerencie contratos de locação dos seus imóveis"
        path="/gestao/contratos"
        noIndex={true}
      />
      <AppLayout title="Contratos">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
            <p className="text-muted-foreground">
              Gerencie contratos de locação, reajustes e assinaturas
            </p>
          </div>
          <ContractsTab />
        </div>
      </AppLayout>
    </>
  );
};

export default ContratosEmGestao;
