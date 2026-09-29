import { Info, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CurrencyInput, PercentInput } from "@/components/ui/currency-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyBRL as formatCurrency } from "@/utils/unitPricing";
import { buildRentInstallments } from "@/lib/lease-projection";
import { buildWithholdingInstallments, graceSummary } from "@/lib/lease-special-conditions";
import type {
  RentDeductionConfig,
  RentDeductionReason,
  RentGraceConfig,
  RentGraceTier,
  RentWithholdingConfig,
} from "@/hooks/useLeases";

const GRACE_MODE_OPTIONS: { value: RentGraceTier["mode"]; label: string }[] = [
  { value: "free", label: "Isento (sem aluguel)" },
  { value: "percent", label: "Desconto em %" },
  { value: "fixed", label: "Valor fixo a pagar" },
];

const REASON_OPTIONS: { value: RentDeductionReason; label: string }[] = [
  { value: "condominium_extra", label: "Condomínio extraordinário" },
  { value: "improvement", label: "Benfeitoria" },
  { value: "repair", label: "Reparo" },
  { value: "other", label: "Outro" },
];

const RECURRENCE_OPTIONS: { value: RentDeductionConfig["recurrence"]; label: string }[] = [
  { value: "once", label: "Uma vez" },
  { value: "installments", label: "Parcelado" },
  { value: "monthly", label: "Todo mês" },
];

interface LeaseSpecialConditionsCardProps {
  startDate: string;
  rentAmount: number;
  dueDay: number;
  adminFeePercent: number;
  /** IPTU mensal pago pelo proprietário (base do IRRF, modo tabela). */
  ownerIptu: number;
  /** Condomínio mensal pago pelo proprietário (base do IRRF, modo tabela). */
  ownerCondominium: number;
  rentGrace: RentGraceConfig;
  rentDeductions: RentDeductionConfig[];
  rentWithholding: RentWithholdingConfig;
  onChange: (patch: {
    rent_grace?: RentGraceConfig;
    rent_deductions?: RentDeductionConfig[];
    rent_withholding?: RentWithholdingConfig;
  }) => void;
}

const startCompetency = (startDate: string) =>
  startDate && /^\d{4}-\d{2}/.test(startDate) ? startDate.slice(0, 7) : new Date().toISOString().slice(0, 7);

export function LeaseSpecialConditionsCard({
  startDate,
  rentAmount,
  dueDay,
  adminFeePercent,
  ownerIptu,
  ownerCondominium,
  rentGrace,
  rentDeductions,
  rentWithholding,
  onChange,
}: LeaseSpecialConditionsCardProps) {
  const defaultCompetency = startCompetency(startDate);

  /* ─── Carência ─── */
  const updateGrace = (patch: Partial<RentGraceConfig>) => onChange({ rent_grace: { ...rentGrace, ...patch } });
  const updateTier = (index: number, patch: Partial<RentGraceTier>) =>
    updateGrace({ tiers: rentGrace.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) });
  const grace = graceSummary(rentGrace, startDate || `${defaultCompetency}-01`);

  /* ─── Abatimentos ─── */
  const updateDeduction = (id: string, patch: Partial<RentDeductionConfig>) =>
    onChange({ rent_deductions: rentDeductions.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  const addDeduction = () =>
    onChange({
      rent_deductions: [
        ...rentDeductions,
        {
          id: crypto.randomUUID(),
          enabled: true,
          label: "",
          reason: "condominium_extra",
          amount: 0,
          recurrence: "once",
          first_competency: defaultCompetency,
        },
      ],
    });
  const deductionsEnabled = rentDeductions.length > 0;

  /* ─── IRRF ─── */
  const updateWithholding = (patch: Partial<RentWithholdingConfig>) =>
    onChange({ rent_withholding: { ...rentWithholding, ...patch } });
  const sampleRent = buildRentInstallments({
    startDate: `${defaultCompetency}-01`,
    months: 1,
    amount: rentAmount || 0,
    dueDay: dueDay || 10,
  });
  const irrfEstimate =
    buildWithholdingInstallments({
      withholding: { ...rentWithholding, enabled: true },
      rentInstallments: sampleRent,
      baseDeductions: { iptu: ownerIptu, condominium: ownerCondominium, adminFeePercent },
    })[0]?.amount ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Condições especiais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Carência */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="rent-grace-toggle" className="text-sm font-medium cursor-pointer">
              Carência
            </Label>
            <Switch
              id="rent-grace-toggle"
              checked={rentGrace.enabled}
              onCheckedChange={(checked) =>
                updateGrace({
                  enabled: checked,
                  first_competency: rentGrace.first_competency || defaultCompetency,
                  tiers: rentGrace.tiers.length ? rentGrace.tiers : [{ months: 1, mode: "free" }],
                })
              }
            />
          </div>

          {rentGrace.enabled && (
            <div className="space-y-3">
              <div className="space-y-2 sm:max-w-[220px]">
                <Label>A partir da competência</Label>
                <Input
                  type="month"
                  value={rentGrace.first_competency || defaultCompetency}
                  onChange={(e) => updateGrace({ first_competency: e.target.value || defaultCompetency })}
                />
              </div>

              {rentGrace.tiers.map((tier, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[100px_1fr_1fr_auto] gap-2 items-end rounded-md border border-border p-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Meses</Label>
                    <Input
                      type="number"
                      min={1}
                      max={36}
                      value={tier.months}
                      onChange={(e) =>
                        updateTier(index, { months: Math.min(36, Math.max(1, parseInt(e.target.value) || 1)) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={tier.mode}
                      onValueChange={(v) => updateTier(index, { mode: v as RentGraceTier["mode"], value: v === "free" ? undefined : tier.value ?? 0 })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRACE_MODE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    {tier.mode === "percent" && (
                      <>
                        <Label className="text-xs">Desconto (%)</Label>
                        <PercentInput value={tier.value ?? 0} onChange={(v) => updateTier(index, { value: v })} />
                      </>
                    )}
                    {tier.mode === "fixed" && (
                      <>
                        <Label className="text-xs">Valor a pagar</Label>
                        <CurrencyInput
                          value={(tier.value ?? 0).toString()}
                          onChange={(v) => updateTier(index, { value: parseFloat(v) || 0 })}
                          placeholder="R$ 0,00"
                        />
                      </>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover faixa"
                    disabled={rentGrace.tiers.length <= 1}
                    onClick={() => updateGrace({ tiers: rentGrace.tiers.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => updateGrace({ tiers: [...rentGrace.tiers, { months: 1, mode: "percent", value: 50 }] })}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar faixa
              </Button>

              {grace.label && <p className="text-sm font-medium">{grace.label}</p>}
              <p className="text-[11px] text-muted-foreground flex gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Nos meses isentos não é gerado lançamento de aluguel. Encargos (IPTU, condomínio...) seguem normais.
                Reajuste não altera parcelas de carência.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Abatimentos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label htmlFor="rent-deductions-toggle" className="text-sm font-medium cursor-pointer">
                Abatimentos no aluguel
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Valores que o proprietário assume e são descontados do aluguel do inquilino
              </p>
            </div>
            <Switch
              id="rent-deductions-toggle"
              checked={deductionsEnabled}
              onCheckedChange={(checked) => (checked ? addDeduction() : onChange({ rent_deductions: [] }))}
            />
          </div>

          {deductionsEnabled && (
            <div className="space-y-3">
              {rentDeductions.map((d) => {
                const total =
                  d.recurrence === "monthly"
                    ? `${formatCurrency(d.amount || 0)}/mês`
                    : formatCurrency((d.amount || 0) * (d.recurrence === "installments" ? d.installments || 2 : 1));
                return (
                  <div key={d.id} className="rounded-md border border-border p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">Descrição *</Label>
                        <Input
                          value={d.label}
                          placeholder="Ex.: taxa extra de condomínio para benfeitoria"
                          onChange={(e) => updateDeduction(d.id, { label: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-5"
                        aria-label="Remover abatimento"
                        onClick={() => onChange({ rent_deductions: rentDeductions.filter((x) => x.id !== d.id) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Motivo</Label>
                        <Select value={d.reason} onValueChange={(v) => updateDeduction(d.id, { reason: v as RentDeductionReason })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REASON_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <CurrencyInput
                          value={(d.amount || 0).toString()}
                          onChange={(v) => updateDeduction(d.id, { amount: parseFloat(v) || 0 })}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Recorrência</Label>
                        <Select
                          value={d.recurrence}
                          onValueChange={(v) =>
                            updateDeduction(d.id, {
                              recurrence: v as RentDeductionConfig["recurrence"],
                              installments: v === "installments" ? d.installments || 2 : undefined,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RECURRENCE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {d.recurrence === "installments" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Nº de parcelas</Label>
                          <Input
                            type="number"
                            min={2}
                            max={60}
                            value={d.installments || 2}
                            onChange={(e) =>
                              updateDeduction(d.id, {
                                installments: Math.min(60, Math.max(2, parseInt(e.target.value) || 2)),
                              })
                            }
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">A partir da competência</Label>
                        <Input
                          type="month"
                          value={d.first_competency || defaultCompetency}
                          onChange={(e) => updateDeduction(d.id, { first_competency: e.target.value || defaultCompetency })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observação (opcional)</Label>
                      <Textarea
                        rows={2}
                        value={d.notes || ""}
                        onChange={(e) => updateDeduction(d.id, { notes: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total: <span className="font-medium text-foreground">{total}</span>
                    </p>
                  </div>
                );
              })}

              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addDeduction}>
                <Plus className="h-3.5 w-3.5" /> Adicionar abatimento
              </Button>
              <p className="text-[11px] text-muted-foreground flex gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                O inquilino paga o aluguel já com o desconto. O abatimento entra como despesa do proprietário e aparece
                na DRE como custo do imóvel.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* IRRF */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="rent-withholding-toggle" className="text-sm font-medium cursor-pointer">
              Imposto retido na fonte (IRRF)
            </Label>
            <Switch
              id="rent-withholding-toggle"
              checked={rentWithholding.enabled}
              onCheckedChange={(checked) => updateWithholding({ enabled: checked, tax: "irrf" })}
            />
          </div>

          {rentWithholding.enabled && (
            <div className="space-y-3">
              <RadioGroup
                value={rentWithholding.mode}
                onValueChange={(v) => updateWithholding({ mode: v as RentWithholdingConfig["mode"] })}
                className="space-y-1"
              >
                {[
                  { value: "fixed", label: "Valor fixo por mês" },
                  { value: "percent", label: "% sobre o aluguel" },
                  { value: "table", label: "Estimar pela tabela do IR 2026" },
                ].map((o) => (
                  <div key={o.value} className="flex items-center gap-2">
                    <RadioGroupItem value={o.value} id={`irrf-mode-${o.value}`} />
                    <Label htmlFor={`irrf-mode-${o.value}`} className="text-sm font-normal cursor-pointer">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {rentWithholding.mode === "fixed" && (
                <div className="space-y-2 sm:max-w-[220px]">
                  <Label>Valor retido por mês</Label>
                  <CurrencyInput
                    value={(rentWithholding.fixed_amount ?? 0).toString()}
                    onChange={(v) => updateWithholding({ fixed_amount: parseFloat(v) || 0 })}
                    placeholder="R$ 0,00"
                  />
                </div>
              )}
              {rentWithholding.mode === "percent" && (
                <div className="space-y-2 sm:max-w-[220px]">
                  <Label>Percentual sobre o aluguel</Label>
                  <PercentInput
                    value={rentWithholding.percent ?? 0}
                    onChange={(v) => updateWithholding({ percent: v })}
                  />
                </div>
              )}
              {rentWithholding.mode === "table" && (
                <div className="space-y-2">
                  <Label className="text-xs">Descontar da base:</Label>
                  {(
                    [
                      { key: "iptu", label: "IPTU pago pelo proprietário" },
                      { key: "condominium", label: "Condomínio pago pelo proprietário" },
                      { key: "admin_fee", label: "Taxa de administração" },
                    ] as const
                  ).map((o) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`irrf-base-${o.key}`}
                        checked={!!rentWithholding.base_deductions?.[o.key]}
                        onCheckedChange={(checked) =>
                          updateWithholding({
                            base_deductions: { ...rentWithholding.base_deductions, [o.key]: checked === true },
                          })
                        }
                      />
                      <Label htmlFor={`irrf-base-${o.key}`} className="text-sm font-normal cursor-pointer">
                        {o.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm">
                Valor mensal estimado: <span className="font-semibold">{formatCurrency(irrfEstimate)}</span>
              </p>
              {rentWithholding.mode === "table" && irrfEstimate <= 0 && (
                <p className="text-xs text-muted-foreground">
                  Pela tabela de 2026 este aluguel fica na faixa de isenção: nada a reter.
                </p>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>O que você precisa fazer</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1 text-xs mt-1">
                    <li>
                      Quando o inquilino é empresa (PJ) e o locador é pessoa física, a empresa desconta o IRRF do aluguel
                      e recolhe por DARF (código 3208) até o dia 20 do mês seguinte. Você recebe o valor líquido.
                    </li>
                    <li>
                      Peça todo ano o Informe de Rendimentos do inquilino (até o fim de fevereiro) e guarde os
                      comprovantes.
                    </li>
                    <li>
                      Na declaração anual, informe o aluguel bruto em 'Rendimentos tributáveis recebidos de pessoa
                      jurídica' com o imposto retido. Esse aluguel não entra no carnê-leão.
                    </li>
                    <li>
                      A estimativa pela tabela é só referência: use o valor que o inquilino realmente reteve e confirme
                      com seu contador.
                    </li>
                    <li>
                      No Slotimob o aluguel fica pelo valor bruto, o IRRF vira uma dedução na DRE e a conciliação espera
                      o valor líquido no banco.
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
