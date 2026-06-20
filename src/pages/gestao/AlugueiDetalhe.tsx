import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import { useAssetHealth } from "@/hooks/useAssetHealth";
import { AssetDetailDialog } from "@/components/assets/AssetDetailDialog";
import { cn } from "@/lib/utils";

const OVERALL_STATUS_CONFIG = {
  healthy: { label: "Saudável", className: "bg-green-500/15 text-green-600 border-green-500/30" },
  attention: { label: "Atenção", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  critical: { label: "Crítico", className: "bg-red-500/15 text-red-600 border-red-500/30" },
} as const;

const AlugueiDetalhe = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const unitId = searchParams.get("id");

  const { data: assets, isLoading } = useAssetHealth(new Date());
  const asset = useMemo(
    () => assets?.find((a) => a.unitId === unitId) ?? null,
    [assets, unitId]
  );

  // Keep the AssetDetailDialog always open while on this page.
  const [dialogOpen, setDialogOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!unitId) navigate("/gestao/alugueis", { replace: true });
  }, [unitId, navigate]);

  const handleBack = () => navigate("/gestao/alugueis");

  // When the user closes the dialog (overlay click, ESC, etc.), return to list.
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) handleBack();
  };

  if (loading || !user) return null;

  const title = asset
    ? asset.propertyName
      ? `${asset.unitNumber} — ${asset.propertyName}`
      : asset.unitNumber
    : "Ativo";

  return (
    <>
      <SEOHead
        title={`${title} - Aluguéis`}
        description="Detalhes do ativo gerenciado"
        path="/gestao/alugueis"
        noIndex={true}
      />
      <AppLayout title="Aluguéis">
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
              {asset?.ownerName && (
                <p className="text-sm text-muted-foreground truncate">
                  Proprietário: {asset.ownerName}
                </p>
              )}
            </div>
            {asset && OVERALL_STATUS_CONFIG[asset.overallStatus] && (
              <Badge
                variant="outline"
                className={cn("text-xs", OVERALL_STATUS_CONFIG[asset.overallStatus].className)}
              >
                {OVERALL_STATUS_CONFIG[asset.overallStatus].label}
              </Badge>
            )}
          </div>

          {isLoading && !asset && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!isLoading && !asset && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Ativo não encontrado.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleBack}>
                Voltar para a lista
              </Button>
            </div>
          )}
        </div>

        {asset && (
          <AssetDetailDialog
            open={dialogOpen}
            onOpenChange={handleDialogOpenChange}
            asset={asset}
          />
        )}
      </AppLayout>
    </>
  );
};

export default AlugueiDetalhe;
