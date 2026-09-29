import { useEffect, useRef, useState, type ReactNode } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { Info, RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput, PercentInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactSelector } from "@/components/ContactSelector";
import { formatCurrencyBRL as formatCurrency } from "@/utils/unitPricing";
import { useCustomObligationTypes } from "@/hooks/useCustomObligationTypes";
import {
  isUncategorizedObligation,
  resolveObligationLabel,
  UNCATEGORIZED_OBLIGATION_NOTICE,
} from "@/lib/obligation-labels";
import type {
  AdditionalObligationType,
  FireInsuranceConfig,
  IptuChargeConfig,
  LeaseChargeResponsible,
  ObligationChargeConfig,
  LeaseChargeResponsibleLink,
  RentDeductionConfig,
  RentGraceConfig,
  RentWithholdingConfig,
} from "@/hooks/useLeases";
import { LeaseSpecialConditionsCard } from "./LeaseSpecialConditionsCard";
import { buildRentInstallments } from "@/lib/lease-projection";
import {
  buildRentDeductionInstallments,
  buildWithholdingInstallments,
  graceSummary,
  resolveGraceSchedule,
  summarizeSettlement,
} from "@/lib/lease-special-conditions";

export const ADJUSTMENT_PERIODICITY_OPTIONS = [12, 24, 30, 36];

export interface LeaseFinancialValue {
  rent_amount: number;
  due_day: number;
  admin_fee_percentage: number;
  deposit_amount: number;
  start_date: string;
  end_date: string;
  is_indefinite_term: boolean;
  adjustment_index: string;
  adjustment_periodicity_months: number;
  next_adjustment_date: string;
  fire_insurance: FireInsuranceConfig;
  iptu_charge: IptuChargeConfig;
  additional_obligations: ObligationChargeConfig[];
  rent_grace: RentGraceConfig;
  rent_deductions: RentDeductionConfig[];
  rent_withholding: RentWithholdingConfig;
}

export function getInitialRentGrace(startDate?: string | null): RentGraceConfig {
  const competency =
    startDate && /^\d{4}-\d{2}/.test(startDate) ? startDate.slice(0, 7) : format(new Date(), "yyyy-MM");
  return { enabled: false, first_competency: competency, tiers: [{ months: 1, mode: "free" }] };
}

export function getInitialRentWithholding(): RentWithholdingConfig {
  return {
    enabled: false,
    tax: "irrf",
    mode: "table",
    base_deductions: { iptu: false, condominium: false, admin_fee: false },
  };
}

export function normalizeRentDeductions(v: unknown): RentDeductionConfig[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((d) => d && typeof d === "object" && typeof (d as any).id === "string")
    .map((d: any) => ({
      id: d.id,
      enabled: d.enabled !== false,
      label: String(d.label ?? ""),
      reason: d.reason ?? "other",
      amount: Number(d.amount) || 0,
      recurrence: d.recurrence ?? "once",
      installments: d.installments != null ? Number(d.installments) : undefined,
      first_competency: String(d.first_competency ?? ""),
      notes: d.notes ?? undefined,
    }));
}

/** Dados do imóvel usados como default dos encargos */
export interface LeaseFinancialUnit {
  iptu?: number | null;
  obligations_config?: Record<string, any> | null;
}

export interface LeaseResponsibleContact {
  id: string | null;
  name: string | null;
}

interface LeaseFinancialStepProps {
  value: LeaseFinancialValue;
  onChange: (patch: Partial<LeaseFinancialValue>) => void;
  unit?: LeaseFinancialUnit | null;
  /** Inquilino já selecionado na etapa de Inquilino do contrato */
  tenantContact?: LeaseResponsibleContact | null;
  /** Proprietário vinculado ao imóvel/unidade selecionado */
  ownerContact?: LeaseResponsibleContact | null;
  /** Conteúdo extra no topo (ex.: seletor de fração) */
  header?: ReactNode;
  /** Em edição, o próximo reajuste salvo não deve ser sobrescrito pela sugestão */
  adjustmentLocked?: boolean;
  /** CPF/CNPJ do inquilino (IRRF só se aplica com CNPJ). */
  tenantDocument?: string | null;
}


export function getInitialFireInsurance(): FireInsuranceConfig {
  return {
    enabled: false,
    total_amount: 0,
    installments: 12,
    installment_amount: 0,
    first_due_date: null,
    charge_to: "tenant",
  };
}

export function getInitialIptuCharge(): IptuChargeConfig {
  return {
    enabled: false,
    annual_amount: 0,
    installments: 10,
    installment_amount: 0,
    first_due_date: null,
    charge_to: "tenant",
    source: "manual",
  };
}

/**
 * Encargos adicionais configuráveis no contrato.
 * Mesma taxonomia da Matriz de Responsabilidades (`SYSTEM_OBLIGATION_TYPES` /
 * `ObligationType` em useAssetHealth), sem `rent` (é o aluguel), `insurance`
 * (tratado por fire_insurance) e `iptu` (tratado por iptu_charge).
 * A chave `obligationKey` é a usada dentro de `units.obligations_config`.
 */
export const ADDITIONAL_OBLIGATIONS: {
  type: AdditionalObligationType;
  label: string;
  obligationKey: string;
}[] = [
  { type: "condominium", label: "Condomínio", obligationKey: "condominium" },
  { type: "energy", label: "Energia", obligationKey: "energy" },
  { type: "water", label: "Água", obligationKey: "water" },
  { type: "gas", label: "Gás", obligationKey: "gas" },
  { type: "garbage_fee", label: "Taxa de Lixo", obligationKey: "garbage_fee" },
  { type: "other", label: "Outros", obligationKey: "other" },
];

export function getInitialAdditionalObligation(
  type: AdditionalObligationType
): ObligationChargeConfig {
  return {
    type,
    enabled: false,
    installment_amount: 0,
    first_due_date: null,
    charge_to: "tenant",
    label: null,
  };
}

export function getInitialAdditionalObligations(): ObligationChargeConfig[] {
  return ADDITIONAL_OBLIGATIONS.map((o) => getInitialAdditionalObligation(o.type));
}

/**
 * Normaliza a lista vinda do banco garantindo um item por tipo da taxonomia fixa
 * e **preservando** qualquer outro tipo já salvo (ex.: `custom_<uuid>`),
 * para não descartar configurações feitas com tipos customizados do corretor.
 */
export function normalizeAdditionalObligations(
  saved?: ObligationChargeConfig[] | null
): ObligationChargeConfig[] {
  const list = Array.isArray(saved) ? saved : [];
  const base = ADDITIONAL_OBLIGATIONS.map((o) => {
    const found = list.find((i) => i?.type === o.type);
    return found
      ? { ...getInitialAdditionalObligation(o.type), ...found }
      : getInitialAdditionalObligation(o.type);
  });
  const knownTypes = new Set(ADDITIONAL_OBLIGATIONS.map((o) => o.type));
  const extras = list
    .filter((i) => i?.type && !knownTypes.has(i.type))
    .map((i) => ({ ...getInitialAdditionalObligation(i.type), ...i }));
  return [...base, ...extras];
}


const RESPONSIBLE_OPTIONS: { value: LeaseChargeResponsible; label: string }[] = [
  { value: "tenant", label: "Inquilino" },
  { value: "owner", label: "Proprietário" },
  { value: "agency", label: "Imobiliária" },
];

/**
 * Seletor de Responsável vinculado a registros reais.
 * - Inquilino: mostra o inquilino já selecionado na etapa de Inquilino
 * - Proprietário: mostra o proprietário do imóvel/unidade do contrato
 * - Imobiliária: combobox de contatos da categoria "Imobiliária"
 */
function ResponsibleField({
  idPrefix,
  value,
  onChange,
  tenantContact,
  ownerContact,
}: {
  idPrefix: string;
  value: LeaseChargeResponsibleLink & { charge_to: LeaseChargeResponsible };
  onChange: (patch: Partial<LeaseChargeResponsibleLink> & { charge_to?: LeaseChargeResponsible }) => void;
  tenantContact?: LeaseResponsibleContact | null;
  ownerContact?: LeaseResponsibleContact | null;
}) {
  const chargeTo = value.charge_to;

  const linkedName =
    chargeTo === "tenant"
      ? tenantContact?.name
      : chargeTo === "owner"
        ? ownerContact?.name
        : null;

  const handleChargeTo = (next: LeaseChargeResponsible) => {
    onChange({
      charge_to: next,
      responsible_contact_id:
        next === "tenant"
          ? tenantContact?.id ?? null
          : next === "owner"
            ? ownerContact?.id ?? null
            : value.agency_contact_id ?? null,
    });
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={`${idPrefix}-responsible`}>Responsável</Label>
      <Select value={chargeTo} onValueChange={(v) => handleChargeTo(v as LeaseChargeResponsible)}>
        <SelectTrigger id={`${idPrefix}-responsible`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESPONSIBLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {chargeTo === "agency" ? (
        <div className="space-y-1.5">
          <Label id="leasefinancialstep-imobiliaria-responsavel" className="text-xs text-muted-foreground">Imobiliária responsável</Label>
          <ContactSelector aria-labelledby="leasefinancialstep-imobiliaria-responsavel"
            value={value.agency_contact_id || null}
            onChange={(contactId) =>
              onChange({ agency_contact_id: contactId, responsible_contact_id: contactId })
            }
            filterCategories={["Imobiliária"]}
            placeholder="Selecione a imobiliária..."
          />
          <p className="text-[11px] text-muted-foreground">
            Lista de contatos da categoria "Imobiliária".
          </p>
        </div>
      ) : linkedName ? (
        <Badge variant="secondary" className="font-normal">
          {chargeTo === "tenant" ? "Inquilino" : "Proprietário"}: {linkedName}
        </Badge>
      ) : (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          {chargeTo === "tenant"
            ? "Selecione o inquilino na etapa de Inquilino para vincular o registro."
            : "O imóvel selecionado não tem proprietário cadastrado."}
        </p>
      )}
    </div>
  );
}

const parseLocalDate = (value: string): Date | null => {
  if (!value) return null;
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date(value);
  } catch {
    return null;
  }
};

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export function LeaseFinancialStep({
  value,
  onChange,
  unit,
  tenantContact,
  ownerContact,
  header,
  adjustmentLocked = false,
  tenantDocument,
}: LeaseFinancialStepProps) {
  const [adjustmentTouched, setAdjustmentTouched] = useState(adjustmentLocked);
  const suggestedRef = useRef<string>("");
  const { data: customObligationTypes = [] } = useCustomObligationTypes();

  /** `uuid do tipo customizado -> nome`, usado só como fallback do rótulo. */
  const customTypeNames = customObligationTypes.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {});


  const suggestNextAdjustment = (): string => {
    const start = parseLocalDate(value.start_date);
    if (!start) return "";
    const months = value.adjustment_periodicity_months || 12;
    return format(addMonths(start, months), "yyyy-MM-dd");
  };

  const suggestion = suggestNextAdjustment();
  suggestedRef.current = suggestion;

  // Sugere automaticamente enquanto o usuário não editar manualmente
  useEffect(() => {
    if (adjustmentTouched) return;
    if (!suggestion || suggestion === value.next_adjustment_date) return;
    onChange({ next_adjustment_date: suggestion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion, adjustmentTouched]);

  const endDateInvalid =
    !value.is_indefinite_term &&
    !!value.end_date &&
    !!value.start_date &&
    value.end_date < value.start_date;

  const updateFireInsurance = (patch: Partial<FireInsuranceConfig>) =>
    onChange({ fire_insurance: { ...value.fire_insurance, ...patch } });

  const updateIptu = (patch: Partial<IptuChargeConfig>) =>
    onChange({ iptu_charge: { ...value.iptu_charge, ...patch } });

  const firstRentDueDate = (): string => {
    const start = parseLocalDate(value.start_date);
    if (!start) return "";
    const due = new Date(start.getFullYear(), start.getMonth(), Math.min(value.due_day || 10, 28));
    if (due < start) due.setMonth(due.getMonth() + 1);
    return format(due, "yyyy-MM-dd");
  };

  const obligations = (unit?.obligations_config || {}) as Record<string, any>;

  const dueDateFromObligation = (key: string): string => {
    const dueDay = Number(obligations?.[key]?.due_day);
    if (!dueDay || dueDay < 1 || dueDay > 28) return firstRentDueDate();
    const base = parseLocalDate(value.start_date) || new Date();
    const due = new Date(base.getFullYear(), base.getMonth(), dueDay);
    if (due < base) due.setMonth(due.getMonth() + 1);
    return format(due, "yyyy-MM-dd");
  };

  const responsibleFromObligation = (key: string): LeaseChargeResponsible => {
    const responsible = String(obligations?.[key]?.responsible || "").toLowerCase();
    if (responsible === "owner" || responsible === "proprietario" || responsible === "proprietário") {
      return "owner";
    }
    if (responsible === "agency" || responsible === "imobiliaria" || responsible === "imobiliária") {
      return "agency";
    }
    return "tenant";
  };

  const additionalObligations = normalizeAdditionalObligations(value.additional_obligations);

  /**
   * Opções exibidas: tipos fixos + tipos customizados do corretor (`custom_<uuid>`,
   * mesma convenção da aba Obrigações). "Outros" fica sempre por último.
   */
  const obligationOptions: {
    type: AdditionalObligationType;
    label: string;
    obligationKey: string;
    isCustom?: boolean;
  }[] = [
    ...ADDITIONAL_OBLIGATIONS.filter((o) => o.type !== "other"),
    ...customObligationTypes.map((t) => ({
      type: `custom_${t.id}`,
      label: t.name,
      obligationKey: `custom_${t.id}`,
      isCustom: true,
    })),
    ...ADDITIONAL_OBLIGATIONS.filter((o) => o.type === "other"),
  ];


  const updateAdditional = (
    type: AdditionalObligationType,
    patch: Partial<ObligationChargeConfig>
  ) => {
    const exists = additionalObligations.some((o) => o.type === type);
    const next = exists
      ? additionalObligations.map((o) => (o.type === type ? { ...o, ...patch } : o))
      : [...additionalObligations, { ...getInitialAdditionalObligation(type), ...patch }];
    onChange({ additional_obligations: next });
  };

  const toggleAdditional = (type: AdditionalObligationType, enabled: boolean) => {
    if (!enabled) {
      updateAdditional(type, { enabled: false });
      return;
    }
    const meta = obligationOptions.find((o) => o.type === type);
    const current = additionalObligations.find((o) => o.type === type);
    updateAdditional(type, {
      enabled: true,
      first_due_date:
        current?.first_due_date || dueDateFromObligation(meta?.obligationKey || type),
      charge_to:
        current?.charge_to || responsibleFromObligation(meta?.obligationKey || type),
      label: current?.label ?? (meta?.isCustom ? meta.label : null),
    });
  };


  const toggleFireInsurance = (enabled: boolean) => {
    if (!enabled) {
      updateFireInsurance({ enabled: false });
      return;
    }
    updateFireInsurance({
      enabled: true,
      first_due_date: value.fire_insurance.first_due_date || dueDateFromObligation("insurance"),
      charge_to: value.fire_insurance.charge_to || responsibleFromObligation("insurance"),
    });
  };

  const toggleIptu = (enabled: boolean) => {
    if (!enabled) {
      updateIptu({ enabled: false });
      return;
    }
    const unitIptu = Number(unit?.iptu || 0);
    const annual = value.iptu_charge.annual_amount || unitIptu || 0;
    const installments = value.iptu_charge.installments || 10;
    updateIptu({
      enabled: true,
      annual_amount: annual,
      installment_amount: annual ? round2(annual / installments) : 0,
      source: value.iptu_charge.annual_amount ? value.iptu_charge.source : unitIptu ? "unit" : "manual",
      first_due_date: value.iptu_charge.first_due_date || dueDateFromObligation("iptu"),
      charge_to: value.iptu_charge.charge_to || responsibleFromObligation("iptu"),
    });
  };

  const insuranceInstallment = value.fire_insurance.enabled
    ? value.fire_insurance.installment_amount || 0
    : 0;
  const iptuInstallment = value.iptu_charge.enabled ? value.iptu_charge.installment_amount || 0 : 0;
  /**
   * Todas as obrigações do contrato normalizadas para o cálculo.
   * Regra (validada com o cliente):
   * - tenant  -> soma à cobrança do inquilino
   * - owner   -> soma ao repasse líquido do proprietário (reembolso/repasse)
   * - agency  -> a imobiliária absorve: não soma nem subtrai de ninguém
   * A taxa de administração incide SOMENTE sobre o aluguel.
   */
  const chargeLines: { key: string; label: string; amount: number; charge_to: LeaseChargeResponsible }[] = [
    ...(value.fire_insurance.enabled
      ? [
          {
            key: "fire_insurance",
            label: "Seguro incêndio",
            amount: insuranceInstallment,
            charge_to: value.fire_insurance.charge_to,
          },
        ]
      : []),
    ...(value.iptu_charge.enabled
      ? [
          {
            key: "iptu",
            label: "IPTU",
            amount: iptuInstallment,
            charge_to: value.iptu_charge.charge_to,
          },
        ]
      : []),
    ...additionalObligations
      .filter((o) => o.enabled)
      .map((o) => ({
        key: o.type,
        label: resolveObligationLabel(o.type, o.label, customTypeNames),
        amount: o.installment_amount || 0,
        charge_to: o.charge_to,
      })),
  ];

  const sumBy = (responsible: LeaseChargeResponsible) =>
    chargeLines
      .filter((l) => l.charge_to === responsible)
      .reduce((sum, l) => sum + (l.amount || 0), 0);

  const adminFeeAmount = round2(value.rent_amount * ((value.admin_fee_percentage || 0) / 100));
  const tenantCharges = sumBy("tenant");
  const ownerCharges = sumBy("owner");
  const agencyCharges = sumBy("agency");

  /* ─── Condições especiais: mês típico (1ª competência sem carência) ─── */
  const rentGrace = value.rent_grace ?? getInitialRentGrace(value.start_date);
  const rentDeductions = normalizeRentDeductions(value.rent_deductions);
  const rentWithholding = value.rent_withholding ?? getInitialRentWithholding();
  const startForCalc = value.start_date || format(new Date(), "yyyy-MM-dd");
  const graceInfo = graceSummary(rentGrace, startForCalc);
  const projectionRents = buildRentInstallments({
    startDate: startForCalc,
    months: 60,
    amount: value.rent_amount || 0,
    dueDay: value.due_day || 10,
    graceSchedule: resolveGraceSchedule(rentGrace, startForCalc),
  });
  const typicalRent = projectionRents.find((r) => r.meta?.kind === "rent");
  const graceDiscountTotal = round2(
    projectionRents
      .filter((r) => r.meta?.kind === "grace")
      .reduce((sum, r) => sum + ((r.meta?.gross_amount ?? r.amount) - r.amount), 0)
  );
  const iptuForBase = value.iptu_charge.enabled ? iptuInstallment : 0;
  const condoForBase =
    additionalObligations.find((o) => o.type === "condominium" && o.enabled)?.installment_amount || 0;
  const { installments: deductionLines } = buildRentDeductionInstallments({
    deductions: rentDeductions,
    rentInstallments: projectionRents,
  });
  const irrfLines = buildWithholdingInstallments({
    withholding: rentWithholding,
    rentInstallments: typicalRent ? [typicalRent] : [],
    baseDeductions: { iptu: iptuForBase, condominium: condoForBase, adminFeePercent: value.admin_fee_percentage || 0 },
  });
  const typicalSettlement = typicalRent
    ? summarizeSettlement([
        typicalRent,
        ...deductionLines.filter((d) => d.settlementKey === typicalRent.settlementKey),
        ...irrfLines,
      ])[0]
    : undefined;
  const typicalGross = typicalSettlement?.gross ?? round2(value.rent_amount || 0);
  const typicalDeductions = typicalSettlement?.deductions ?? 0;
  const typicalIrrf = typicalSettlement?.irrf ?? 0;
  const typicalNetRent = typicalSettlement?.net ?? typicalGross;

  const totalTenant = round2(typicalNetRent + tenantCharges);
  const netToOwner = round2(typicalNetRent - adminFeeAmount - ownerCharges);

  return (
    <div className="space-y-4">
      {header}

      {/* Bloco A — Aluguel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Aluguel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leasefinancialstep-valor-do-aluguel">Valor do Aluguel *</Label>
              <CurrencyInput id="leasefinancialstep-valor-do-aluguel"
                value={value.rent_amount.toString()}
                onChange={(v) => onChange({ rent_amount: parseFloat(v) || 0 })}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leasefinancialstep-dia-de-vencimento">Dia de Vencimento *</Label>
              <Select
                value={value.due_day.toString()}
                onValueChange={(v) => onChange({ due_day: parseInt(v) })}
              >
                <SelectTrigger id="leasefinancialstep-dia-de-vencimento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leasefinancialstep-taxa-de-administracao">Taxa de Administração (%)</Label>
              <PercentInput id="leasefinancialstep-taxa-de-administracao"
                value={value.admin_fee_percentage}
                onChange={(v) => onChange({ admin_fee_percentage: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloco B — Vigência e Reajuste */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Vigência e Reajuste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              A vigência define até quando o contrato vale. O reajuste define quando o valor do
              aluguel é corrigido. São datas independentes.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leasefinancialstep-inicio-do-contrato">Início do Contrato *</Label>
              <Input id="leasefinancialstep-inicio-do-contrato"
                type="date"
                value={value.start_date}
                onChange={(e) => onChange({ start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leasefinancialstep-fim-do-contrato">Fim do Contrato</Label>
              <Input id="leasefinancialstep-fim-do-contrato"
                type="date"
                value={value.is_indefinite_term ? "" : value.end_date}
                disabled={value.is_indefinite_term}
                className={value.is_indefinite_term ? "bg-muted" : undefined}
                onChange={(e) => onChange({ end_date: e.target.value })}
              />
              <div className="flex items-center gap-2 pt-0.5">
                <Switch
                  id="is-indefinite-term"
                  checked={value.is_indefinite_term}
                  onCheckedChange={(checked) =>
                    onChange({ is_indefinite_term: checked, end_date: checked ? "" : value.end_date })
                  }
                />
                <Label htmlFor="is-indefinite-term" className="text-xs font-normal cursor-pointer">
                  Prazo indeterminado
                </Label>
              </div>
              {endDateInvalid && (
                <p className="text-[11px] text-destructive">
                  A data de fim não pode ser anterior ao início do contrato.
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leasefinancialstep-indice-de-reajuste">Índice de Reajuste *</Label>
              <Select
                value={value.adjustment_index}
                onValueChange={(v) => onChange({ adjustment_index: v })}
              >
                <SelectTrigger id="leasefinancialstep-indice-de-reajuste">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IGPM">IGP-M</SelectItem>
                  <SelectItem value="IPCA">IPCA</SelectItem>
                  <SelectItem value="INPC">INPC</SelectItem>
                  <SelectItem value="Fixo">Fixo (sem reajuste)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leasefinancialstep-periodicidade-do-reajuste">Periodicidade do Reajuste</Label>
              <Select
                value={String(value.adjustment_periodicity_months || 12)}
                onValueChange={(v) => onChange({ adjustment_periodicity_months: parseInt(v) })}
              >
                <SelectTrigger id="leasefinancialstep-periodicidade-do-reajuste">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_PERIODICITY_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      A cada {m} meses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leasefinancialstep-data-do-proximo-reajuste">Data do Próximo Reajuste</Label>
            <div className="flex items-center gap-2">
              <Input id="leasefinancialstep-data-do-proximo-reajuste"
                type="date"
                value={value.next_adjustment_date || ""}
                onChange={(e) => {
                  setAdjustmentTouched(true);
                  onChange({ next_adjustment_date: e.target.value });
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => {
                  setAdjustmentTouched(false);
                  if (suggestedRef.current) onChange({ next_adjustment_date: suggestedRef.current });
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Recalcular
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sugestão automática: início + {value.adjustment_periodicity_months || 12} meses. Você
              pode informar outra data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bloco C — Encargos do Contrato */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Encargos do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seguro incêndio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="fire-insurance-toggle" className="text-sm font-medium cursor-pointer">
                Cobrar seguro incêndio
              </Label>
              <Switch
                id="fire-insurance-toggle"
                checked={value.fire_insurance.enabled}
                onCheckedChange={toggleFireInsurance}
              />
            </div>

            {value.fire_insurance.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-valor-total-da-apolice">Valor total da apólice</Label>
                  <CurrencyInput id="leasefinancialstep-valor-total-da-apolice"
                    value={value.fire_insurance.total_amount.toString()}
                    onChange={(v) => {
                      const total = parseFloat(v) || 0;
                      const installments = value.fire_insurance.installments || 1;
                      updateFireInsurance({
                        total_amount: total,
                        installment_amount: round2(total / installments),
                      });
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-no-de-parcelas">Nº de parcelas</Label>
                  <Input id="leasefinancialstep-no-de-parcelas"
                    type="number"
                    min={1}
                    max={12}
                    value={value.fire_insurance.installments}
                    onChange={(e) => {
                      const installments = Math.min(12, Math.max(1, parseInt(e.target.value) || 1));
                      updateFireInsurance({
                        installments,
                        installment_amount: round2(
                          (value.fire_insurance.total_amount || 0) / installments
                        ),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-valor-da-parcela">Valor da parcela</Label>
                  <CurrencyInput id="leasefinancialstep-valor-da-parcela"
                    value={value.fire_insurance.installment_amount.toString()}
                    onChange={(v) => {
                      const installment = parseFloat(v) || 0;
                      const installments = value.fire_insurance.installments || 1;
                      updateFireInsurance({
                        installment_amount: installment,
                        total_amount: round2(installment * installments),
                      });
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-primeiro-vencimento">Primeiro vencimento</Label>
                  <Input id="leasefinancialstep-primeiro-vencimento"
                    type="date"
                    value={value.fire_insurance.first_due_date || ""}
                    onChange={(e) => updateFireInsurance({ first_due_date: e.target.value || null })}
                  />
                </div>
                <ResponsibleField
                  idPrefix="fire-insurance"
                  value={value.fire_insurance}
                  onChange={(patch) => updateFireInsurance(patch)}
                  tenantContact={tenantContact}
                  ownerContact={ownerContact}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* IPTU */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="iptu-toggle" className="text-sm font-medium cursor-pointer">
                Cobrar IPTU parcelado
              </Label>
              <Switch
                id="iptu-toggle"
                checked={value.iptu_charge.enabled}
                onCheckedChange={toggleIptu}
              />
            </div>

            {value.iptu_charge.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-valor-anual-do-iptu">Valor anual do IPTU</Label>
                  <CurrencyInput id="leasefinancialstep-valor-anual-do-iptu"
                    value={value.iptu_charge.annual_amount.toString()}
                    onChange={(v) => {
                      const annual = parseFloat(v) || 0;
                      const installments = value.iptu_charge.installments || 1;
                      updateIptu({
                        annual_amount: annual,
                        installment_amount: round2(annual / installments),
                        source: "manual",
                      });
                    }}
                    placeholder="R$ 0,00"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {value.iptu_charge.source === "unit"
                      ? "Puxado do cadastro do imóvel — edite se necessário."
                      : unit?.iptu
                        ? "Valor informado manualmente."
                        : "O imóvel não tem IPTU anual cadastrado — informe aqui ou preencha no cadastro do imóvel."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-no-de-parcelas-2">Nº de parcelas</Label>
                  <Input id="leasefinancialstep-no-de-parcelas-2"
                    type="number"
                    min={1}
                    max={12}
                    value={value.iptu_charge.installments}
                    onChange={(e) => {
                      const installments = Math.min(12, Math.max(1, parseInt(e.target.value) || 1));
                      updateIptu({
                        installments,
                        installment_amount: round2(
                          (value.iptu_charge.annual_amount || 0) / installments
                        ),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-valor-da-parcela-2">Valor da parcela</Label>
                  <CurrencyInput id="leasefinancialstep-valor-da-parcela-2"
                    value={value.iptu_charge.installment_amount.toString()}
                    onChange={(v) => {
                      const installment = parseFloat(v) || 0;
                      const installments = value.iptu_charge.installments || 1;
                      updateIptu({
                        installment_amount: installment,
                        annual_amount: round2(installment * installments),
                        source: "manual",
                      });
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leasefinancialstep-primeiro-vencimento-2">Primeiro vencimento</Label>
                  <Input id="leasefinancialstep-primeiro-vencimento-2"
                    type="date"
                    value={value.iptu_charge.first_due_date || ""}
                    onChange={(e) => updateIptu({ first_due_date: e.target.value || null })}
                  />
                </div>
                <ResponsibleField
                  idPrefix="iptu"
                  value={value.iptu_charge}
                  onChange={(patch) => updateIptu(patch)}
                  tenantContact={tenantContact}
                  ownerContact={ownerContact}
                />
              </div>
            )}
          </div>

          {obligationOptions.map((meta) => {
            const cfg =
              additionalObligations.find((o) => o.type === meta.type) ||
              getInitialAdditionalObligation(meta.type);
            return (
              <div key={meta.type} className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor={`obligation-${meta.type}-toggle`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    Cobrar {meta.label.toLowerCase()}
                  </Label>
                  <Switch
                    id={`obligation-${meta.type}-toggle`}
                    checked={cfg.enabled}
                    onCheckedChange={(checked) => toggleAdditional(meta.type, checked)}
                  />
                </div>

                {cfg.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`leasefinancialstep-valor-mensal-${meta.type}`}>Valor mensal</Label>
                      <CurrencyInput id={`leasefinancialstep-valor-mensal-${meta.type}`}
                        value={(cfg.installment_amount || 0).toString()}
                        onChange={(v) =>
                          updateAdditional(meta.type, {
                            installment_amount: parseFloat(v) || 0,
                          })
                        }
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`leasefinancialstep-primeiro-vencimento-3-${meta.type}`}>Primeiro vencimento</Label>
                      <Input id={`leasefinancialstep-primeiro-vencimento-3-${meta.type}`}
                        type="date"
                        value={cfg.first_due_date || ""}
                        onChange={(e) =>
                          updateAdditional(meta.type, {
                            first_due_date: e.target.value || null,
                          })
                        }
                      />
                    </div>
                    {isUncategorizedObligation(meta.type) && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`leasefinancialstep-descricao-${meta.type}`}>Descrição</Label>
                        <Input id={`leasefinancialstep-descricao-${meta.type}`}
                          value={cfg.label || ""}
                          onChange={(e) =>
                            updateAdditional(meta.type, { label: e.target.value || null })
                          }
                          placeholder="Ex.: jardinagem, portaria, limpeza..."
                        />
                        <p className="text-xs text-muted-foreground flex items-start gap-1.5 [text-wrap:pretty]">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            Este nome é usado nas parcelas geradas.{" "}
                            {UNCATEGORIZED_OBLIGATION_NOTICE}
                          </span>
                        </p>
                      </div>
                    )}
                    <ResponsibleField
                      idPrefix={`obligation-${meta.type}`}
                      value={cfg}
                      onChange={(patch) => updateAdditional(meta.type, patch)}
                      tenantContact={tenantContact}
                      ownerContact={ownerContact}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <LeaseSpecialConditionsCard
        startDate={value.start_date}
        rentAmount={value.rent_amount}
        dueDay={value.due_day}
        adminFeePercent={value.admin_fee_percentage || 0}
        ownerIptu={iptuForBase}
        ownerCondominium={condoForBase}
        rentGrace={rentGrace}
        rentDeductions={rentDeductions}
        rentWithholding={rentWithholding}
        tenantDocument={tenantDocument}
        onChange={onChange}
      />

      {/* Resumo — mês típico (1ª competência sem carência), separado por parte */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-3">
        <div className="space-y-1">
          <p className="font-semibold">
            O inquilino paga (mês típico{typicalRent ? `: ${typicalRent.competencyLabel}` : ""})
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aluguel bruto</span>
            <span className="font-medium">{formatCurrency(typicalGross)}</span>
          </div>
          {typicalDeductions > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">(−) Abatimentos do mês</span>
              <span className="font-medium text-destructive">−{formatCurrency(typicalDeductions)}</span>
            </div>
          )}
          {typicalIrrf > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">(−) IRRF retido</span>
              <span className="font-medium text-destructive">−{formatCurrency(typicalIrrf)}</span>
            </div>
          )}
          {chargeLines
            .filter((l) => l.charge_to === "tenant")
            .map((line) => (
              <div key={line.key} className="flex justify-between">
                <span className="text-muted-foreground">(+) {line.label}</span>
                <span className="font-medium">+{formatCurrency(line.amount)}</span>
              </div>
            ))}
          <div className="flex justify-between items-center rounded-md bg-primary/10 px-2 py-1.5">
            <span className="font-semibold">= Líquido a receber do inquilino</span>
            <span className="font-bold text-primary text-base">{formatCurrency(totalTenant)}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          <p className="font-semibold">O proprietário recebe (mês típico)</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aluguel líquido do inquilino</span>
            <span className="font-medium">{formatCurrency(typicalNetRent)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              (−) Taxa de administração ({(value.admin_fee_percentage || 0).toLocaleString("pt-BR")}%)
            </span>
            <span className="font-medium text-destructive">−{formatCurrency(adminFeeAmount)}</span>
          </div>
          {chargeLines
            .filter((l) => l.charge_to === "owner")
            .map((line) => (
              <div key={line.key} className="flex justify-between">
                <span className="text-muted-foreground">(−) {line.label}</span>
                <span className="font-medium text-destructive">−{formatCurrency(line.amount)}</span>
              </div>
            ))}
          <div className="flex justify-between items-center rounded-md bg-primary/10 px-2 py-1.5">
            <span className="font-semibold">= Repasse estimado ao proprietário</span>
            <span className="font-bold text-primary text-base">{formatCurrency(netToOwner)}</span>
          </div>
        </div>

        {agencyCharges > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Encargos sob responsabilidade da imobiliária ({formatCurrency(agencyCharges)}) não são cobrados do
            inquilino nem descontados do proprietário.
          </p>
        )}

        {rentGrace.enabled && graceInfo.label && (
          <p className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium text-foreground">Carência:</span> {graceInfo.label} (−
            {formatCurrency(graceDiscountTotal)} no período)
          </p>
        )}
      </div>
    </div>
  );
}
