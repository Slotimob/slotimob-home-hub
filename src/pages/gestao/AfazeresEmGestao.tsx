import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { TasksTab } from "@/components/assets/TasksTab";
import { SEOHead } from "@/components/SEOHead";

const AfazeresEmGestao = () => {
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
        title="Afazeres - Gestão"
        description="Acompanhe pendências financeiras e contratuais dos seus imóveis"
        path="/gestao/afazeres"
        noIndex={true}
      />
      <AppLayout title="Afazeres">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Afazeres</h1>
            <p className="text-muted-foreground">
              Acompanhe pendências financeiras e contratuais dos seus imóveis
            </p>
          </div>
          <TasksTab />
        </div>
      </AppLayout>
    </>
  );
};

export default AfazeresEmGestao;
