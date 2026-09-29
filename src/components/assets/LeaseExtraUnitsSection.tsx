import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UnitMultiSelector } from "@/components/units/UnitMultiSelector";
import { unitLabel, type UnitOption } from "@/components/units/UnitSelector";
import { unitHasOtherLiveLease, leaseUnitRefKey, type LeaseUnitRef } from "@/lib/unit-status-sync";

const NO_LEASE = "00000000-0000-0000-0000-000000000000";

export interface LeaseExtraUnitsState {
  enabled: boolean;
  units: UnitOption[];
  /** Por unit_id adicional: null/ausente = imóvel inteiro; array = frações escolhidas. */
  fractions: Record<string, string[] | null>;
  /** Rótulos das frações conhecidas (id → label), para resumos. */
  fractionLabels?: Record<string, string>;
  shareEnabled: boolean;
  /** % por leaseUnitRefKey (principal + adicionais). */
  shares: Record<string, number>;
}

export const EMPTY_EXTRA_UNITS: LeaseExtraUnitsState = {
  enabled: false,
  units: [],
  fractions: {},
  fractionLabels: {},
  shareEnabled: false,
  shares: {},
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Vínculos na ordem: principal primeiro, depois adicionais (inteiro ou por fração). */
export function leaseUnitRefsFor(primary: LeaseUnitRef, state: LeaseExtraUnitsState): LeaseUnitRef[] {
  const out: LeaseUnitRef[] = [];
  const seen = new Set<string>();
  const push = (r: LeaseUnitRef) => {
    if (!r.unit_id) return;
    const k = leaseUnitRefKey(r);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(r);
  };
  push(primary);
  if (state.enabled) {
    for (const u of state.units) {
      const fr = state.fractions?.[u.id];
      if (u.id === primary.unit_id) {
        // Principal é fração: o mesmo imóvel só entra por outras frações (nunca inteiro).
        if (!primary.unit_subdivision_id || !Array.isArray(fr)) continue;
        fr.filter((s) => s !== primary.unit_subdivision_id).forEach((s) => push({ unit_id: u.id, unit_subdivision_id: s }));
        continue;
      }
      if (Array.isArray(fr) && fr.length) fr.forEach((s) => push({ unit_id: u.id, unit_subdivision_id: s }));
      else if (!Array.isArray(fr)) push({ unit_id: u.id, unit_subdivision_id: null });
    }
  }
  return out;
}

/** Erro de validação do rateio (null = válido). */
export function validateLeaseShares(primary: LeaseUnitRef, state: LeaseExtraUnitsState): string | null {
  const keys = leaseUnitRefsFor(primary, state).map(leaseUnitRefKey);
  if (!state.enabled || !state.shareEnabled || keys.length < 2) return null;
  if (keys.some((k) => !(Number(state.shares[k]) > 0))) return "Cada imóvel precisa de um percentual maior que 0.";
  const total = round2(keys.reduce((s, k) => s + (Number(state.shares[k]) || 0), 0));
  if (Math.abs(total - 100) > 0.01) return `O rateio precisa somar 100% (hoje: ${total.toLocaleString("pt-BR")}%).`;
  return null;
}

/** Valida frações escolhidas e rateio. */
export function validateExtraUnits(
  primary: LeaseUnitRef,
  state: LeaseExtraUnitsState,
  labelOf?: (u: UnitOption) => string,
): string | null {
  if (state.enabled) {
    const empty = state.units.find(
      (u) =>
        (u.id !== primary.unit_id || !!primary.unit_subdivision_id) &&
        Array.isArray(state.fractions?.[u.id]) &&
        state.fractions[u.id]!.filter((x) => x !== primary.unit_subdivision_id).length === 0,
    );
    if (empty) return `Escolha ao menos uma fração de ${(labelOf || unitLabel)(empty)}.`;
  }
  return validateLeaseShares(primary, state);
}

/** Divide 100% igualmente (resto de centavos no principal). */
export function equalShares(ids: string[]): Record<string, number> {
  if (!ids.length) return {};
  const each = Math.floor((100 / ids.length) * 100) / 100;
  const out: Record<string, number> = {};
  ids.forEach((id) => (out[id] = each));
  out[ids[0]] = round2(100 - each * (ids.length - 1));
  return out;
}

interface Props {
  primary: LeaseUnitRef;
  primaryLabel: string;
  value: LeaseExtraUnitsState;
  onChange: (v: LeaseExtraUnitsState) => void;
  brokerId: string;
  editLeaseId?: string | null;
}

interface SubRow {
  id: string;
  unit_id: string;
  label: string;
  area: number | null;
  tenantName: string | null;
  occupied: boolean;
}

export function LeaseExtraUnitsSection({ primary, primaryLabel, value, onChange, brokerId, editLeaseId }: Props) {
  const primaryUnitId = primary.unit_id;
  const primaryIsFraction = !!primary.unit_subdivision_id;
  const { data: rawOptions = [], isLoading } = useQuery({
    queryKey: ["lease-extra-unit-options", brokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, is_standalone, tenant_contact_id, property_id, has_subdivisions, property:properties(name)")
        .eq("broker_id", brokerId)
        .eq("is_managed", true)
        .in("intent_type", ["rental", "both"])
        .order("unit_number");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!brokerId && value.enabled,
  });

  const options = useMemo(
    () =>
      rawOptions.map((u) => ({
        id: u.id,
        unit_number: primaryIsFraction && u.id === primaryUnitId ? `${u.unit_number} (outras frações)` : u.unit_number,
        is_standalone: u.is_standalone,
        tenant_contact_id: u.tenant_contact_id,
        property_id: u.property_id ?? null,
        property_name: u.property?.name ?? null,
      })) as UnitOption[],
    [rawOptions, primaryIsFraction, primaryUnitId],
  );
  const hasSubs = useMemo(() => {
    const m = new Map<string, boolean>();
    rawOptions.forEach((u) => m.set(u.id, !!u.has_subdivisions));
    return m;
  }, [rawOptions]);

  const extraUnits = value.units.filter((u) => primaryIsFraction || u.id !== primaryUnitId);
  const subUnitIds = extraUnits.filter((u) => hasSubs.get(u.id) || Array.isArray(value.fractions?.[u.id])).map((u) => u.id);

  const { data: subs = [] } = useQuery({
    queryKey: ["lease-extra-unit-subdivisions", subUnitIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_subdivisions")
        .select("id, unit_id, label, area, status, tenant_contact_id, contacts:tenant_contact_id(name)")
        .in("unit_id", subUnitIds)
        .order("created_at");
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        unit_id: s.unit_id,
        label: s.label,
        area: s.area ?? null,
        tenantName: s.contacts?.name ?? null,
        occupied: !!s.tenant_contact_id || s.status === "rented",
      })) as SubRow[];
    },
    enabled: value.enabled && subUnitIds.length > 0,
  });

  const fractionLabel = (subId: string) =>
    subs.find((s) => s.id === subId)?.label || value.fractionLabels?.[subId] || "Fração";

  const refs = leaseUnitRefsFor(primary, value);
  const keys = refs.map(leaseUnitRefKey);
  const extraRefs = refs.slice(1);

  const { data: busyKeys = [] } = useQuery({
    queryKey: ["lease-extra-units-busy", extraRefs.map(leaseUnitRefKey).join(","), editLeaseId ?? null],
    queryFn: async () => {
      const res = await Promise.all(
        extraRefs.map(async (r) =>
          (await unitHasOtherLiveLease(r.unit_id, editLeaseId || NO_LEASE, r.unit_subdivision_id)) ? leaseUnitRefKey(r) : null,
        ),
      );
      return res.filter(Boolean) as string[];
    },
    enabled: value.enabled && extraRefs.length > 0,
  });

  const shareError =
    busyKeys.length > 0
      ? "Imóveis ou frações com contrato ativo não podem entrar em outro contrato."
      : validateExtraUnits(primary, value);
  const total = round2(keys.reduce((s, k) => s + (Number(value.shares[k]) || 0), 0));
  const unitName = (id: string) => {
    if (id === primaryUnitId) return primaryLabel;
    const u = value.units.find((x) => x.id === id);
    return u ? unitLabel(u) : id;
  };
  const refLabel = (r: LeaseUnitRef) => {
    if (r.unit_id === primaryUnitId && leaseUnitRefKey(r) === keys[0]) return primaryLabel;
    return r.unit_subdivision_id ? `${unitName(r.unit_id)} — ${fractionLabel(r.unit_subdivision_id)}` : unitName(r.unit_id);
  };

  const handleUnitsChange = (units: UnitOption[]) => {
    const ids = new Set(units.map((u) => u.id));
    const fractions = { ...value.fractions };
    const shares = { ...value.shares };
    value.units.forEach((u) => {
      if (ids.has(u.id)) return;
      delete fractions[u.id];
      Object.keys(shares).forEach((k) => {
        if (k === u.id || k.startsWith(`${u.id}:`)) delete shares[k];
      });
    });
    // Principal é fração: o próprio imóvel entra sempre no modo "frações".
    if (primaryIsFraction && ids.has(primaryUnitId) && !Array.isArray(fractions[primaryUnitId])) fractions[primaryUnitId] = [];
    onChange({ ...value, units, fractions, shares });
  };

  const setMode = (unitId: string, mode: "whole" | "fractions") => {
    const shares = { ...value.shares };
    Object.keys(shares).forEach((k) => {
      if (k === unitId || k.startsWith(`${unitId}:`)) delete shares[k];
    });
    onChange({ ...value, fractions: { ...value.fractions, [unitId]: mode === "whole" ? null : [] }, shares });
  };

  const toggleFraction = (unitId: string, sub: SubRow, checked: boolean) => {
    const cur = value.fractions?.[unitId] || [];
    const next = checked ? Array.from(new Set([...cur, sub.id])) : cur.filter((x) => x !== sub.id);
    const shares = { ...value.shares };
    if (!checked) delete shares[`${unitId}:${sub.id}`];
    onChange({
      ...value,
      fractions: { ...value.fractions, [unitId]: next },
      fractionLabels: { ...(value.fractionLabels || {}), [sub.id]: sub.label },
      shares,
    });
  };

  return (
    <div className="space-y-3 border rounded-lg p-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="extra-units-switch" className="text-sm">Este contrato inclui outros imóveis?</Label>
        <Switch
          id="extra-units-switch"
          checked={value.enabled}
          onCheckedChange={(checked) => onChange({ ...value, enabled: checked })}
        />
      </div>

      {value.enabled && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Imóveis adicionais</Label>
            <UnitMultiSelector
              value={extraUnits}
              onChange={handleUnitsChange}
              options={options}
              optionsLoading={isLoading}
              excludeIds={primaryUnitId && !primaryIsFraction ? [primaryUnitId] : []}
              placeholder="Buscar imóveis adicionais..."
            />
            <p className="text-[11px] text-muted-foreground">
              Escolha o imóvel inteiro ou só as frações que entram neste contrato. O imóvel escolhido acima continua sendo o principal.
            </p>
          </div>

          {extraUnits.length > 0 && (
            <div className="space-y-2">
              {extraUnits.map((u) => {
                const isPrimaryUnit = primaryIsFraction && u.id === primaryUnitId;
                const unitSubs = subs.filter((s) => s.unit_id === u.id && s.id !== primary.unit_subdivision_id);
                const fr = value.fractions?.[u.id];
                const isFractions = isPrimaryUnit || Array.isArray(fr);
                const withSubs = hasSubs.get(u.id) || unitSubs.length > 0 || isFractions;
                return (
                  <div key={u.id} className="bg-card border rounded-md p-2 space-y-2">
                    <p className="text-sm font-medium truncate">{unitLabel(u)}</p>
                    {withSubs ? (
                      <>
                        {isPrimaryUnit ? (
                          <p className="text-xs text-muted-foreground">Escolha as outras frações deste imóvel que entram no contrato.</p>
                        ) : (
                        <RadioGroup
                          value={isFractions ? "fractions" : "whole"}
                          onValueChange={(v) => setMode(u.id, v as "whole" | "fractions")}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="whole" id={`whole-${u.id}`} />
                            <Label htmlFor={`whole-${u.id}`} className="text-sm font-normal">Imóvel inteiro</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="fractions" id={`fr-${u.id}`} />
                            <Label htmlFor={`fr-${u.id}`} className="text-sm font-normal">Frações</Label>
                          </div>
                        </RadioGroup>
                        )}
                        {isFractions && (
                          <div className="space-y-1.5 pl-1">
                            {unitSubs.length === 0 && (
                              <p className="text-xs text-muted-foreground">{isPrimaryUnit && subs.length ? "Nenhuma outra fração neste imóvel." : "Carregando frações..."}</p>
                            )}
                            {unitSubs.map((s) => (
                              <div key={s.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`sub-${s.id}`}
                                  disabled={s.occupied && !(fr || []).includes(s.id)}
                                  checked={(fr || []).includes(s.id)}
                                  onCheckedChange={(c) => toggleFraction(u.id, s, c === true)}
                                />
                                <Label htmlFor={`sub-${s.id}`} className="flex-1 min-w-0 text-sm font-normal truncate">
                                  {s.label}
                                  {s.area != null && ` · ${Number(s.area).toLocaleString("pt-BR")} m²`}
                                </Label>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {s.occupied ? `Ocupada${s.tenantName ? ` por ${s.tenantName}` : ""}` : "Livre"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Imóvel inteiro</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {busyKeys.length > 0 && (
            <Alert className="border-amber-500/50">
              <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <AlertDescription className="text-xs">
                Já possui outro contrato ativo ou pendente:{" "}
                {extraRefs.filter((r) => busyKeys.includes(leaseUnitRefKey(r))).map(refLabel).join(", ")}. Imóveis ou frações com contrato ativo não podem entrar em outro contrato.
              </AlertDescription>
            </Alert>
          )}

          {refs.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="share-switch" className="text-sm">Ratear o aluguel entre os imóveis</Label>
                <Switch
                  id="share-switch"
                  checked={value.shareEnabled}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...value,
                      shareEnabled: checked,
                      shares: checked && Object.keys(value.shares).length === 0 ? equalShares(keys) : value.shares,
                    })
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                O rateio só afeta relatórios e a DRE por imóvel. O lançamento e a cobrança continuam únicos, no imóvel principal.
                {!value.shareEnabled && " Desligado: partes iguais."}
              </p>

              {value.shareEnabled && (
                <div className="space-y-2">
                  {refs.map((r, i) => {
                    const k = leaseUnitRefKey(r);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="flex-1 min-w-0 text-sm truncate">
                          {refLabel(r)}
                          {i === 0 && <span className="text-xs text-muted-foreground"> (principal)</span>}
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step="0.01"
                          className="w-24 text-base sm:text-sm"
                          value={value.shares[k] ?? ""}
                          onChange={(e) =>
                            onChange({ ...value, shares: { ...value.shares, [k]: parseFloat(e.target.value) || 0 } })
                          }
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between gap-2">
                    <span className={shareError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                      {shareError ?? `Total: ${total.toLocaleString("pt-BR")}%`}
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, shares: equalShares(keys) })}>
                      Dividir igualmente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {shareError && !value.shareEnabled && <p className="text-xs text-destructive">{shareError}</p>}
        </>
      )}
    </div>
  );
}
