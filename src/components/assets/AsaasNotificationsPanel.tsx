import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { offsetLabel } from "@/components/assets/BillingRulerCard";

interface Props {
  leaseId: string;
  canEdit: boolean;
}

/**
 * Painel compacto com a configuração real de notificações da Asaas para este
 * contrato. Vive na aba Boletos porque acompanha o boleto, não a régua de
 * e-mail da Slotimob.
 */
export function AsaasNotificationsPanel({ leaseId, canEdit }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const {
    data: config,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["asaas-notifications", leaseId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("asaas-notifications", {
        body: { action: "get", lease_id: leaseId },
      });
      if (error) throw error;
      return data as any;
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-notifications", {
        body: { action: "sync", lease_id: leaseId },
      });
      if (error) throw error;
      setSyncResult(data);
      toast.success("Notificações sincronizadas com a Asaas");
      refetch();
    } catch (e: any) {
      toast.error("Erro ao sincronizar", { description: e?.message });
    } finally {
      setSyncing(false);
    }
  };

  const notifications: any[] = Array.isArray(config?.notifications) ? config.notifications : [];

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">O que a Asaas envia</CardTitle>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Sincronizar
          </Button>
        )}
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando configuração...
          </p>
        ) : notifications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium py-1.5 pr-3">Evento</th>
                  <th className="text-left font-medium py-1.5 pr-3">Dias</th>
                  <th className="text-left font-medium py-1.5">Canais</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n: any, i: number) => (
                  <tr key={n.id ?? i} className="border-b last:border-0">
                    <td className="py-1.5 pr-3">{n.event}</td>
                    <td className="py-1.5 pr-3">
                      {typeof n.scheduleOffset === "number" ? offsetLabel(n.scheduleOffset) : "—"}
                    </td>
                    <td className="py-1.5">
                      {[n.emailEnabledForCustomer && "E-mail", n.whatsappEnabledForCustomer && "WhatsApp"]
                        .filter(Boolean)
                        .join(" · ") || "Nenhum"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma configuração retornada pela Asaas.</p>
        )}

        {syncResult && (
          <div className="rounded-md bg-muted/40 border px-3 py-2 space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Notificações atualizadas: {syncResult.updated ?? 0}
            </p>
            {Array.isArray(syncResult.unsupported) && syncResult.unsupported.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Não suportado pela Asaas: {syncResult.unsupported.join(", ")}
              </p>
            )}
          </div>
        )}

        <div className="rounded-md bg-muted/40 border px-3 py-2 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            A Asaas não avisa por webhook quando dispara uma notificação — não existe comprovante de entrega. O que dá
            para acompanhar é o ciclo da cobrança (criada, vencida, paga) e quando o inquilino abriu o boleto ou o
            checkout.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
