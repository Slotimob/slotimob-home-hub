import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { MonthlySummaryReport } from '@/components/MonthlySummaryReport';

const MonthlyReport = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
    <AppLayout title="Resumo Mensal">
      <div className="max-w-4xl mx-auto">
        <MonthlySummaryReport />
      </div>
    </AppLayout>
  );
};

export default MonthlyReport;
