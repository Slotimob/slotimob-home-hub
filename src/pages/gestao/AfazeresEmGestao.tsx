import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { TasksTab } from "@/components/assets/TasksTab";
import { SEOHead } from "@/components/SEOHead";
import { useProposals } from "@/hooks/useProposals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AfazeresEmGestao = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { proposals } = useProposals();

  const draftProposals = proposals.filter(
    (p) => p.status === "draft" || !p.status
  );

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

          {/* Draft Proposals */}
          {draftProposals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Propostas Não Enviadas
                  <Badge variant="secondary" className="ml-auto">
                    {draftProposals.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {draftProposals.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.property?.name
                            ? `${p.property.name} - ${p.unit?.unit_number || ""}`
                            : p.unit?.unit_number || "Imóvel"}
                        </p>
                        {p.lead_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {p.lead_name} ·{" "}
                            {format(new Date(p.created_at), "dd/MM/yy", {
                              locale: ptBR,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/gestao/propostas")}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Enviar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <TasksTab />
        </div>
      </AppLayout>
    </>
  );
};

export default AfazeresEmGestao;
