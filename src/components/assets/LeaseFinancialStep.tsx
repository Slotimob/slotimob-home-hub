import { useEffect, useRef, useState, type ReactNode } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { Info, RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import type {
  FireInsuranceConfig,
  IptuChargeConfig,
  LeaseChargeResponsible,
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
}

/** Dados do imóvel usados como default dos encargos */
export interface LeaseFinancialUnit {
  iptu?: number | null;
  obligations_config?: Record<string, any> | null;
}

interface LeaseFinancialStepProps {
  value: LeaseFinancialValue;
  onChange: (patch: Partial<LeaseFinancialValue>) => void;
  unit?: LeaseFinancialUnit | null;
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
  header,
  adjustmentLocked = false,
}: LeaseFinancialStepProps) {
  const [adjustmentTouched, setAdjustmentTouched] = useState(adjustmentLocked);
  const suggestedRef = useRef<string>("");

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

  const dueDateFromObligation = (key: "iptu" | "insurance"): string => {
    const dueDay = Number(obligations?.[key]?.due_day);
    if (!dueDay || dueDay < 1 || dueDay > 28) return firstRentDueDate();
    const base = parseLocalDate(value.start_date) || new Date();
    const due = new Date(base.getFullYear(), base.getMonth(), dueDay);
    if (due < base) due.setMonth(due.getMonth() + 1);
    return format(due, "yyyy-MM-dd");
  };

  const responsibleFromObligation = (key: "iptu" | "insurance"): LeaseChargeResponsible => {
    const responsible = String(obligations?.[key]?.responsible || "").toLowerCase();
    if (responsible === "owner" || responsible === "proprietario" || responsible === "proprietário") {
      return "owner";
    }
    return "tenant";
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
  const totalTenant =
    value.rent_amount +
    (value.fire_insurance.charge_to === "tenant" ? insuranceInstallment : 0) +
    (value.iptu_charge.charge_to === "tenant" ? iptuInstallment : 0);
  const netToOwner =
    value.rent_amount * (1 - (value.admin_fee_percentage || 0) / 100) -
    (value.fire_insurance.charge_to === "owner" ? insuranceInstallment : 0) -
    (value.iptu_charge.charge_to === "owner" ? iptuInstallment : 0);

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
              <Input
                type="number"
                min={0}
                max={100}
                value={value.admin_fee_percentage}
                onChange={(e) => onChange({ admin_fee_percentage: parseFloat(e.target.value) || 0 })}
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>Responsável</Label>
                  <Select
                    value={value.fire_insurance.charge_to}
                    onValueChange={(v) =>
                      updateFireInsurance({ charge_to: v as LeaseChargeResponsible })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">Inquilino</SelectItem>
                      <SelectItem value="owner">Proprietário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>Responsável</Label>
                  <Select
                    value={value.iptu_charge.charge_to}
                    onValueChange={(v) => updateIptu({ charge_to: v as LeaseChargeResponsible })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">Inquilino</SelectItem>
                      <SelectItem value="owner">Proprietário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Aluguel</span>
          <span className="font-medium">{formatCurrency(value.rent_amount)}</span>
        </div>
        {value.fire_insurance.enabled && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Seguro incêndio (parcela ·{" "}
              {value.fire_insurance.charge_to === "tenant" ? "inquilino" : "proprietário"})
            </span>
            <span className="font-medium">{formatCurrency(insuranceInstallment)}</span>
          </div>
        )}
        {value.iptu_charge.enabled && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              IPTU (parcela ·{" "}
              {value.iptu_charge.charge_to === "tenant" ? "inquilino" : "proprietário"})
            </span>
            <span className="font-medium">{formatCurrency(iptuInstallment)}</span>
          </div>
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
