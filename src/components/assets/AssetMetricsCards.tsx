import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, differenceInMonths, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Home, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { leaseUnitFilter } from "@/hooks/useLeases";

interface AssetMetricsCardsProps {
  unitId: string;
  rentAmount?: number;
  marketValue?: number;
}

export function AssetMetricsCards({ unitId, rentAmount, marketValue }: AssetMetricsCardsProps) {
  const { effectiveBrokerId } = useWorkspace();
  const brokerId = effectiveBrokerId || undefined;

  // Contratos vivos do imóvel: principal, adicional ou fração (lease_units)
  const { data: liveLeases = [] } = useQuery({
    queryKey: ["unit-live-leases", unitId, brokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("id, unit_id, unit_subdivision_id, start_date, end_date, status, rent_amount, next_adjustment_date, lease_units(unit_id, unit_subdivision_id, share_percent, is_primary)")
        .or(await leaseUnitFilter(unitId))
        .in("status", ["active", "pending"])
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: subdivisionCount = 0 } = useQuery({
    queryKey: ["unit-subdivision-count", unitId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("unit_subdivisions")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unitId);
      if (error) throw error;
      return count || 0;
    },
  });

  // Vínculos deste imóvel em cada contrato vivo
  const leaseLinks = useMemo(
    () =>
      liveLeases.map((l) => {
        const links = ((l.lease_units || []) as any[]).filter((u) => u.unit_id === unitId);
        const wholeUnit = links.length
          ? links.some((u) => !u.unit_subdivision_id)
          : l.unit_id === unitId && !l.unit_subdivision_id;
        const fractionIds = links.length
          ? links.filter((u) => u.unit_subdivision_id).map((u) => u.unit_subdivision_id as string)
          : l.unit_id === unitId && l.unit_subdivision_id ? [l.unit_subdivision_id as string] : [];
        const shares = links.map((u) => u.share_percent).filter((v) => v != null) as number[];
        const share = shares.length ? shares.reduce((a, b) => a + Number(b), 0) : 100;
        return { lease: l, wholeUnit, fractionIds, share };
      }),
    [liveLeases, unitId]
  );
  const activeLease = leaseLinks.find((x) => x.wholeUnit)?.lease ?? null;

  // Último contrato encerrado (vacância)
  const { data: lastLease } = useQuery({
    queryKey: ["unit-last-lease", unitId, brokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("id, end_date, status")
        .or(await leaseUnitFilter(unitId))
        .in("status", ["active", "terminated"])
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: liveLeases.length === 0,
  });

  // Fetch recent rental transactions for yield calculation
  const { data: rentalTransactions = [] } = useQuery({
    queryKey: ["unit-rental-transactions", unitId, brokerId],
    queryFn: async () => {
      const sixMonthsAgo = format(addMonths(new Date(), -6), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("amount, transaction_date, status")
        .eq("unit_id", unitId)
        .eq("type", "income")
        .eq("status", "paid")
        .gte("transaction_date", sixMonthsAgo)
        .order("transaction_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const today = new Date();
    
    // Performance: Average yield
    let avgYield = 0;
    let yieldStatus: "good" | "warning" | "neutral" = "neutral";
    let hasYieldData = false;
    let yieldEstimated = false;
    const contractMonthly = leaseLinks.reduce(
      (sum, x) => sum + (Number(x.lease.rent_amount) || 0) * (x.share / 100),
      0
    );

    if (leaseLinks.length > 0 && contractMonthly > 0 && marketValue && marketValue > 0) {
      avgYield = ((contractMonthly * 12) / marketValue) * 100;
      yieldStatus = avgYield >= 6 ? "good" : avgYield >= 4 ? "warning" : "neutral";
      hasYieldData = true;
    } else if (leaseLinks.length === 0 && rentAmount && marketValue && marketValue > 0) {
      avgYield = ((rentAmount * 12) / marketValue) * 100;
      yieldStatus = "neutral";
      yieldEstimated = true;
      hasYieldData = true;
    } else if (rentalTransactions.length >= 3 && marketValue && marketValue > 0) {
      const totalReceived = rentalTransactions.reduce((sum, t) => sum + t.amount, 0);
      const avgMonthly = totalReceived / rentalTransactions.length;
      avgYield = ((avgMonthly * 12) / marketValue) * 100;
      yieldStatus = avgYield >= 6 ? "good" : avgYield >= 4 ? "warning" : "neutral";
      hasYieldData = true;
    }

    // Occupancy
    let occupancyLabel = "";
    let occupancyStatus: "good" | "warning" | "neutral" = "neutral";
    let occupancyDays = 0;
    
    if (activeLease) {
      const startDate = parseISO(activeLease.start_date);
      const months = differenceInMonths(today, startDate);
      const days = differenceInDays(today, startDate);
      if (months > 0) {
        occupancyLabel = `Ocupado há ${months} meses`;
      } else if (days > 0) {
        occupancyLabel = `Ocupado há ${days} dias`;
      } else {
        occupancyLabel = "Ocupado recentemente";
      }
      occupancyStatus = "good";
      occupancyDays = days;
    } else if (leaseLinks.length > 0) {
      const rented = new Set(leaseLinks.flatMap((x) => x.fractionIds)).size;
      occupancyLabel = `Ocupado parcialmente: ${rented} de ${Math.max(subdivisionCount, rented)} frações`;
      occupancyStatus = "good";
    } else if (lastLease?.end_date) {
      const endDate = parseISO(lastLease.end_date);
      const daysVacant = differenceInDays(today, endDate);
      occupancyLabel = `Vago há ${daysVacant} dias`;
      occupancyStatus = daysVacant > 60 ? "warning" : "neutral";
      occupancyDays = -daysVacant;
    } else {
      occupancyLabel = "Sem histórico de ocupação";
      occupancyStatus = "neutral";
    }

    // Next action
    let nextActionLabel = "";
    let nextActionDate: Date | null = null;
    let nextActionUrgent = false;
    
    const refLease = activeLease ?? leaseLinks[0]?.lease ?? null;
    const minAdjustment = liveLeases
      .map((l) => l.next_adjustment_date as string | null)
      .filter(Boolean)
      .sort()[0] as string | undefined;
    if (refLease?.end_date) {
      const endDate = parseISO(refLease.end_date);
      const daysUntilEnd = differenceInDays(endDate, today);
      
      if (daysUntilEnd <= 90 && daysUntilEnd > 0) {
        nextActionLabel = `Contrato vence em ${daysUntilEnd} dias`;
        nextActionDate = endDate;
        nextActionUrgent = daysUntilEnd <= 30;
      } else if (daysUntilEnd <= 0) {
        nextActionLabel = "Contrato vencido - renovar";
        nextActionUrgent = true;
      } else {
        // Calculate next annual adjustment
        let nextAdjustment: Date;
        if (minAdjustment) {
          nextAdjustment = parseISO(minAdjustment);
        } else {
          nextAdjustment = new Date(parseISO(refLease.start_date));
          while (nextAdjustment <= today) {
            nextAdjustment = addMonths(nextAdjustment, 12);
          }
        }
        const daysUntilAdjustment = differenceInDays(nextAdjustment, today);
        nextActionLabel = `Reajuste em ${format(nextAdjustment, "MMM/yyyy", { locale: ptBR })}`;
        nextActionDate = nextAdjustment;
        nextActionUrgent = daysUntilAdjustment <= 30;
      }
    } else if (refLease && minAdjustment) {
      const nextAdjustment = parseISO(minAdjustment);
      nextActionLabel = `Reajuste em ${format(nextAdjustment, "MMM/yyyy", { locale: ptBR })}`;
      nextActionDate = nextAdjustment;
      nextActionUrgent = differenceInDays(nextAdjustment, today) <= 30;
    } else if (refLease) {
      nextActionLabel = "Contrato ativo sem prazo definido";
    } else {
      nextActionLabel = "Sem contrato ativo";
      nextActionUrgent = false;
    }

    return {
      yield: { value: avgYield, status: yieldStatus, hasData: hasYieldData, estimated: yieldEstimated },
      occupancy: { label: occupancyLabel, status: occupancyStatus, days: occupancyDays },
      nextAction: { label: nextActionLabel, date: nextActionDate, urgent: nextActionUrgent },
    };
  }, [activeLease, leaseLinks, liveLeases, subdivisionCount, lastLease, rentalTransactions, rentAmount, marketValue]);

  const statusColors = {
    good: "text-green-700 dark:text-green-400 bg-green-500/10",
    warning: "text-amber-700 dark:text-amber-400 bg-amber-500/10",
    neutral: "text-muted-foreground bg-muted",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Performance Card */}
      <Card className="overflow-hidden min-h-[120px]">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              metrics.yield.hasData ? statusColors[metrics.yield.status] : "text-muted-foreground bg-muted"
            )}>
              {metrics.yield.hasData ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground">Rendimento</p>
              <p className={cn(
                "text-xl md:text-2xl font-bold break-words",
                !metrics.yield.hasData && "text-muted-foreground"
              )}>
                {metrics.yield.hasData 
                  ? `${metrics.yield.value.toFixed(1)}% a.a.`
                  : "—"
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.yield.hasData && metrics.yield.estimated
                  ? "estimado pelo preço anunciado"
                  : metrics.yield.hasData
                  ? (metrics.yield.value >= 6 ? "Acima da média" : 
                     metrics.yield.value >= 4 ? "Na média" : 
                     "Abaixo da média")
                  : "Cadastre o valor de mercado"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Occupancy Card */}
      <Card className="overflow-hidden min-h-[120px]">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              statusColors[metrics.occupancy.status]
            )}>
              <Home className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground">Ocupação</p>
              <p className="text-sm md:text-base font-semibold break-words">
                {metrics.occupancy.label}
              </p>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  metrics.occupancy.status === "good" && "border-green-500/30 text-green-700 dark:text-green-400",
                  metrics.occupancy.status === "warning" && "border-amber-500/30 text-amber-700 dark:text-amber-400"
                )}
              >
                {metrics.occupancy.status === "good" ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Ativo</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> Disponível</>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Action Card */}
      <Card className="overflow-hidden min-h-[120px]">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              metrics.nextAction.urgent 
                ? "text-red-700 dark:text-red-400 bg-red-500/10" 
                : "text-blue-600 bg-blue-500/10"
            )}>
              {metrics.nextAction.urgent ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Calendar className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground">Próxima Ação</p>
              <p className="text-sm md:text-base font-semibold break-words">
                {metrics.nextAction.label}
              </p>
              {metrics.nextAction.date && (
                <p className="text-xs text-muted-foreground">
                  {format(metrics.nextAction.date, "dd/MM/yyyy")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
