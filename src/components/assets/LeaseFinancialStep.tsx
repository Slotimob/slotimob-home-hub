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
import type {
  AdditionalObligationType,
  FireInsuranceConfig,
  IptuChargeConfig,
  LeaseChargeResponsible,
  ObligationChargeConfig,
  LeaseChargeResponsibleLink,
} from "@/hooks/useLeases";

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
      <Label>Responsável</Label>
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
          <Label className="text-xs text-muted-foreground">Imobiliária responsável</Label>
          <ContactSelector
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
        <p className="text-[11px] text-amber-600">
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
}: LeaseFinancialStepProps) {
  const [adjustmentTouched, setAdjustmentTouched] = useState(adjustmentLocked);
  const suggestedRef = useRef<string>("");
  const { data: customObligationTypes = [] } = useCustomObligationTypes();


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
        label:
          (o.type === "other" && o.label) ||
          ADDITIONAL_OBLIGATIONS.find((m) => m.type === o.type)?.label ||
          o.type,
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

  const totalTenant = round2(value.rent_amount + tenantCharges);
  const netToOwner = round2(value.rent_amount - adminFeeAmount + ownerCharges);

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
              <Label>Valor do Aluguel *</Label>
              <CurrencyInput
                value={value.rent_amount.toString()}
                onChange={(v) => onChange({ rent_amount: parseFloat(v) || 0 })}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Dia de Vencimento *</Label>
              <Select
                value={value.due_day.toString()}
                onValueChange={(v) => onChange({ due_day: parseInt(v) })}
              >
                <SelectTrigger>
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
              <Label>Taxa de Administração (%)</Label>
              <PercentInput
                value={value.admin_fee_percentage}
                onChange={(v) => onChange({ admin_fee_percentage: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Caução</Label>
              <CurrencyInput
                value={value.deposit_amount.toString()}
                onChange={(v) => onChange({ deposit_amount: parseFloat(v) || 0 })}
                placeholder="R$ 0,00"
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
              <Label>Início do Contrato *</Label>
              <Input
                type="date"
                value={value.start_date}
                onChange={(e) => onChange({ start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim do Contrato</Label>
              <Input
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
              <Label>Índice de Reajuste *</Label>
              <Select
                value={value.adjustment_index}
                onValueChange={(v) => onChange({ adjustment_index: v })}
              >
                <SelectTrigger>
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
              <Label>Periodicidade do Reajuste</Label>
              <Select
                value={String(value.adjustment_periodicity_months || 12)}
                onValueChange={(v) => onChange({ adjustment_periodicity_months: parseInt(v) })}
              >
                <SelectTrigger>
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
            <Label>Data do Próximo Reajuste</Label>
            <div className="flex items-center gap-2">
              <Input
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
                  <Label>Valor total da apólice</Label>
                  <CurrencyInput
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
                  <Label>Nº de parcelas</Label>
                  <Input
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
                  <Label>Valor da parcela</Label>
                  <CurrencyInput
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
                  <Label>Primeiro vencimento</Label>
                  <Input
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
                  <Label>Valor anual do IPTU</Label>
                  <CurrencyInput
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
                  <Label>Nº de parcelas</Label>
                  <Input
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
                  <Label>Valor da parcela</Label>
                  <CurrencyInput
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
                  <Label>Primeiro vencimento</Label>
                  <Input
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
                      <Label>Valor mensal</Label>
                      <CurrencyInput
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
                      <Label>Primeiro vencimento</Label>
                      <Input
                        type="date"
                        value={cfg.first_due_date || ""}
                        onChange={(e) =>
                          updateAdditional(meta.type, {
                            first_due_date: e.target.value || null,
                          })
                        }
                      />
                    </div>
                    {meta.type === "other" && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Descrição</Label>
                        <Input
                          value={cfg.label || ""}
                          onChange={(e) =>
                            updateAdditional(meta.type, { label: e.target.value || null })
                          }
                          placeholder="Ex.: taxa de lixo, jardinagem..."
                        />
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

      {/* Resumo */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Aluguel</span>
          <span className="font-medium">{formatCurrency(value.rent_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Taxa de Administração ({(value.admin_fee_percentage || 0).toLocaleString("pt-BR")}% sobre aluguel)
          </span>
          <span className="font-medium text-destructive">
            −{formatCurrency(adminFeeAmount)}
          </span>
        </div>

        {chargeLines.map((line) => (
          <div key={line.key} className="flex justify-between">
            <span className="text-muted-foreground">
              {line.label}{" "}
              {line.charge_to === "owner"
                ? "(repassado ao proprietário)"
                : line.charge_to === "tenant"
                  ? "(cobrado do inquilino)"
                  : "(custo da imobiliária)"}
            </span>
            <span
              className={
                line.charge_to === "agency"
                  ? "font-medium text-muted-foreground"
                  : "font-medium text-emerald-600"
              }
            >
              {line.charge_to === "agency" ? "" : "+"}
              {formatCurrency(line.amount)}
            </span>
          </div>
        ))}

        {agencyCharges > 0 && (
          <p className="text-[11px] text-muted-foreground pt-0.5">
            Encargos sob responsabilidade da imobiliária não são cobrados do inquilino nem
            repassados ao proprietário.
          </p>
        )}

        <Separator className="my-1" />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total mensal a cobrar do inquilino</span>
          <span className="font-semibold">{formatCurrency(totalTenant)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Repasse Líquido (estimado)</span>
          <span className="font-semibold text-primary">{formatCurrency(netToOwner)}</span>
        </div>
      </div>
    </div>
  );
}
