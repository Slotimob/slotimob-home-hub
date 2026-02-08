import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { WeeklySummaryReport } from '@/components/WeeklySummaryReport';

const WeeklyReport = () => {
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
    <AppLayout title="Resumo Semanal">
      <div className="max-w-4xl mx-auto">
        <WeeklySummaryReport />
      </div>
    </AppLayout>
  );
};

export default WeeklyReport;
