import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL as formatCurrency } from "@/utils/unitPricing";
import { todayInSaoPauloDateOnly } from "@/lib/date-only";
import { resolveObligationLabel } from "@/lib/obligation-labels";
import { useCustomObligationTypes } from "@/hooks/useCustomObligationTypes";
import { buildRentInstallments } from "@/lib/lease-projection";
import { useLeaseNextDue } from "@/hooks/useLeaseNextDue";
import {
  buildRentDeductionInstallments,
  buildWithholdingInstallments,
  graceSummary,
  resolveGraceSchedule,
  summarizeSettlement,
} from "@/lib/lease-special-conditions";
export {
  computeLeaseMonthFromConfig,
  type LeaseFinancialConditionsLease,
  type LeaseMonthFigures,
} from "@/lib/lease-special-conditions";
import { computeLeaseMonthFromConfig, type LeaseFinancialConditionsLease, type LeaseMonthFigures } from "@/lib/lease-special-conditions";
import type {
  RentDeductionConfig,
  RentGraceConfig,
  RentWithholdingConfig,
} from "@/hooks/useLeases";

const round2 = (n: number) => Math.round(n * 100) / 100;
const RESPONSIBLE_LABEL: Record<string, string> = {
  tenant: "Inquilino",
  owner: "Proprietário",
  agency: "Imobiliária",
};
const REASON_LABEL: Record<string, string> = {
  condominium_extra: "Condomínio extraordinário",
  improvement: "Benfeitoria",
  repair: "Reparo",
  other: "Outro",
};
const competencyLabel = (c: string) => {
  const l = format(parseISO(`${c}-01`), "MMM/yyyy", { locale: ptBR });
  return l.charAt(0).toUpperCase() + l.slice(1);
};

/** Valores reais já lançados na competência (aluguel, abatimentos, IRRF). */
function useLeaseMonthActuals(leaseId: string, competency: string) {
  return useQuery({
    queryKey: ["lease-month-actuals", leaseId, competency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("amount, obligation_type, status, metadata")
        .or(`lease_id.eq.${leaseId},reference.eq.lease:${leaseId}`)
        .eq("competency_period", competency)
        .neq("status", "cancelled");
      if (error) throw error;
      const rows = data || [];
      const rentRows = rows.filter((r: any) => !r.obligation_type || r.obligation_type === "rent");
      if (rentRows.length === 0) return null;
      const sum = (list: any[]) => round2(list.reduce((s, r) => s + (Number(r.amount) || 0), 0));
      const rentNet = sum(rentRows);
      const gross = round2(
        rentRows.reduce(
          (s: number, r: any) => s + (Number((r.metadata as any)?.gross_amount) || Number(r.amount) || 0),
          0
        )
      );
      const deductions = sum(rows.filter((r: any) => (r.obligation_type || "").startsWith("rent_deduction_")));
      const irrf = sum(rows.filter((r: any) => r.obligation_type === "irrf"));
      return {
        competency,
        gross,
        grace: round2(gross - rentNet),
        deductions,
        irrf,
        net: round2(rentNet - deductions - irrf),
      } as LeaseMonthFigures;
    },
    enabled: !!leaseId && !!competency,
  });
}

export function LeaseFinancialConditionsCard({
  lease,
  canEdit,
}: {
  lease: LeaseFinancialConditionsLease;
  canEdit: boolean;
}) {
  const navigate = useNavigate();
  const { data: customTypes = [] } = useCustomObligationTypes();
  const customTypeNames = useMemo(
    () => Object.fromEntries(customTypes.map((t) => [t.id, t.name])),
    [customTypes]
  );
  const currentCompetency = todayInSaoPauloDateOnly().slice(0, 7);
  const { data: actuals } = useLeaseMonthActuals(lease.id, currentCompetency);
  const configured = useMemo(
    () => computeLeaseMonthFromConfig(lease, currentCompetency),
    [lease, currentCompetency]
  );
  const currentGraceFree = resolveGraceSchedule(lease.rent_grace as any, lease.start_date || todayInSaoPauloDateOnly())
    .get(currentCompetency)?.mode === "free";
  // Próximo vencimento: aluguel pendente mais antigo; sem lançamento, pela
  // configuração pulando competências isentas de carência.
  const nextDue = useLeaseNextDue(lease as any);
  const nextCompetency = nextDue?.competency || currentCompetency;
  const { data: nextActuals } = useLeaseMonthActuals(lease.id, nextCompetency);
  const nextMonth = useMemo(
    () => nextActuals ?? computeLeaseMonthFromConfig(lease, nextCompetency),
    [nextActuals, lease, nextCompetency]
  );
  const typicalMonth = useMemo(() => computeLeaseMonthFromConfig(lease), [lease]);
  void actuals; void configured;

  const feePct = Number(lease.admin_fee_percentage) || 0;
  const charges: { key: string; label: string; amount: number; chargeTo: string }[] = [
    ...(lease.fire_insurance?.enabled
      ? [{
          key: "fire_insurance",
          label: "Seguro incêndio",
          amount: Number(lease.fire_insurance.installment_amount) || 0,
          chargeTo: lease.fire_insurance.charge_to,
        }]
      : []),
    ...(lease.iptu_charge?.enabled
      ? [{
          key: "iptu",
          label: "IPTU",
          amount: Number(lease.iptu_charge.installment_amount) || 0,
          chargeTo: lease.iptu_charge.charge_to,
        }]
      : []),
    ...(lease.additional_obligations || [])
      .filter((o: any) => o?.enabled)
      .map((o: any) => ({
        key: o.type,
        label: resolveObligationLabel(o.type, o.label, customTypeNames),
        amount: Number(o.installment_amount) || 0,
        chargeTo: o.charge_to,
      })),
  ];

  const grace = lease.rent_grace?.enabled ? graceSummary(lease.rent_grace, lease.start_date) : null;
  const graceSchedule = lease.rent_grace?.enabled ? resolveGraceSchedule(lease.rent_grace, lease.start_date) : null;
  const inGrace = !!graceSchedule?.has(currentCompetency);
  const deductions = (lease.rent_deductions || []).filter((d) => d?.enabled);
  const withholding = lease.rent_withholding?.enabled ? lease.rent_withholding : null;
  const irrfTypical = withholding ? computeLeaseMonthFromConfig(lease).irrf : 0;

  const Row = ({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) => (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground min-w-0">{label}</span>
      <span className={`font-medium text-right shrink-0 tabular-nums ${className ?? ""}`}>{value}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">Condições financeiras</CardTitle>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => navigate(`/gestao/contratos/novo?edit=${lease.id}&step=financial`)}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar condições
          </Button>
        )}
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-3">
        <div className="space-y-1.5">
          <Row label="Aluguel bruto" value={formatCurrency(Number(lease.rent_amount) || 0)} />
          <Row label="Vencimento" value={`Dia ${lease.due_day}`} />
          <Row label="Taxa de administração" value={`${feePct.toLocaleString("pt-BR")}%`} />
        </div>

        {charges.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Encargos do contrato</p>
              {charges.map((c) => (
                <Row
                  key={c.key}
                  label={
                    <>
                      {c.label}{" "}
                      <span className="text-xs">({RESPONSIBLE_LABEL[c.chargeTo] ?? "Inquilino"})</span>
                    </>
                  }
                  value={formatCurrency(c.amount)}
                />
              ))}
            </div>
          </>
        )}

        {grace?.label && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Carência</p>
                {grace.lastCompetency && (
                  <Badge variant={inGrace ? "default" : "secondary"} className="text-[10px]">
                    {grace.lastCompetency < currentCompetency
                      ? `Carência encerrada em ${competencyLabel(grace.lastCompetency)}`
                      : graceSchedule && graceSchedule.size > 1
                        ? `Carência de ${competencyLabel(Array.from(graceSchedule.keys())[0])} a ${competencyLabel(grace.lastCompetency)}`
                        : `Carência até ${competencyLabel(grace.lastCompetency)}`}
                  </Badge>
                )}
              </div>
              <p className="text-sm break-words">{grace.label}</p>
            </div>
          </>
        )}

        {deductions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Abatimentos</p>
              {deductions.map((d) => {
                const n = d.recurrence === "installments" ? d.installments || 2 : 1;
                return (
                  <div key={d.id} className="rounded-md border border-border p-2 space-y-0.5">
                    <div className="flex items-start justify-between gap-2 text-sm">
                      <span className="font-medium min-w-0 break-words">{d.label}</span>
                      <span className="font-medium tabular-nums shrink-0">
                        {formatCurrency(Number(d.amount) || 0)}
                        {d.recurrence === "monthly" ? "/mês" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {REASON_LABEL[d.reason] ?? "Outro"} ·{" "}
                      {d.recurrence === "once"
                        ? "Uma vez"
                        : d.recurrence === "monthly"
                          ? "Todo mês"
                          : `${n} parcelas · total ${formatCurrency((Number(d.amount) || 0) * n)}`}{" "}
                      · a partir de {d.first_competency ? competencyLabel(d.first_competency) : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {withholding && (
          <>
            <Separator />
            <Row
              label="IRRF retido"
              value={
                withholding.mode === "fixed"
                  ? `${formatCurrency(Number(withholding.fixed_amount) || 0)}/mês`
                  : withholding.mode === "percent"
                    ? `${(Number(withholding.percent) || 0).toLocaleString("pt-BR")}% (${formatCurrency(irrfTypical)})`
                    : `estimado pela tabela: ${formatCurrency(irrfTypical)}`
              }
            />
          </>
        )}

        <Separator />
        <div className="rounded-md bg-primary/10 px-3 py-2 space-y-1.5">
          <span className="text-sm font-semibold block">Líquido esperado do inquilino</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs">
              Próximo vencimento ({competencyLabel(nextCompetency)}
              {nextDue ? ` · ${format(parseISO(nextDue.dueDate), "dd/MM/yyyy")}` : ""})
            </span>
            <span className="text-base font-bold text-primary tabular-nums">{formatCurrency(nextMonth.net)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {nextActuals ? "valores lançados" : "calculado pela configuração"}
            {nextMonth.deductions > 0 ? ` · abatimentos ${formatCurrency(nextMonth.deductions)}` : ""}
            {nextMonth.irrf > 0 ? ` · IRRF ${formatCurrency(nextMonth.irrf)}` : ""}
            {nextMonth.grace > 0 ? ` · carência ${formatCurrency(nextMonth.grace)}` : ""}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs">Mês típico</span>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(typicalMonth.net)}</span>
          </div>
          {currentGraceFree && (
            <p className="text-[11px] text-muted-foreground">
              {format(parseISO(`${currentCompetency}-01`), "MMM/yyyy", { locale: ptBR })} isento
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default LeaseFinancialConditionsCard;

/**
 * Resumo compacto das condições especiais (carência, abatimentos, IRRF).
 * Não renderiza nada quando nenhuma está ligada.
 */
export function LeaseSpecialConditionsSummaryCard({ lease }: { lease: LeaseFinancialConditionsLease }) {
  const navigate = useNavigate();
  const grace = lease.rent_grace?.enabled ? graceSummary(lease.rent_grace, lease.start_date) : null;
  const deductions = (lease.rent_deductions || []).filter((d) => d?.enabled && Number(d.amount) > 0);
  const withholding = lease.rent_withholding?.enabled ? lease.rent_withholding : null;
  const irrfTypical = useMemo(
    () => (withholding ? computeLeaseMonthFromConfig(lease).irrf : 0),
    [lease, withholding]
  );
  if (!grace?.label && deductions.length === 0 && !withholding) return null;

  const deductionsTotal = round2(
    deductions.reduce((s, d) => {
      const n = d.recurrence === "installments" ? d.installments || 2 : 1;
      return s + (Number(d.amount) || 0) * n;
    }, 0)
  );
  const hasMonthly = deductions.some((d) => d.recurrence === "monthly");

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">Condições especiais do contrato</CardTitle>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => navigate(`/gestao/contratos/novo?edit=${lease.id}&step=financial`)}
        >
          Editar no contrato
        </Button>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-1.5 text-sm">
        {grace?.label && (
          <p className="break-words">
            <span className="text-muted-foreground">Carência: </span>
            {grace.label}
          </p>
        )}
        {deductions.length > 0 && (
          <p className="break-words">
            <span className="text-muted-foreground">Abatimentos: </span>
            {deductions.length} {deductions.length === 1 ? "item" : "itens"} · total{" "}
            {formatCurrency(deductionsTotal)}
            {hasMonthly ? " (+ recorrentes mensais)" : ""}
          </p>
        )}
        {withholding && (
          <p className="break-words">
            <span className="text-muted-foreground">IRRF retido: </span>
            {withholding.mode === "fixed"
              ? `fixo ${formatCurrency(Number(withholding.fixed_amount) || 0)}/mês`
              : withholding.mode === "percent"
                ? `${(Number(withholding.percent) || 0).toLocaleString("pt-BR")}% (${formatCurrency(irrfTypical)})`
                : `estimado pela tabela: ${formatCurrency(irrfTypical)}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
