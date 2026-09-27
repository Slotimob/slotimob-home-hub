import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UnitMultiSelector } from "@/components/units/UnitMultiSelector";
import { unitLabel, type UnitOption } from "@/components/units/UnitSelector";
import { unitHasOtherLiveLease } from "@/lib/unit-status-sync";

const NO_LEASE = "00000000-0000-0000-0000-000000000000";

export interface LeaseExtraUnitsState {
  enabled: boolean;
  units: UnitOption[];
  shareEnabled: boolean;
  /** % por unit_id (principal + adicionais). */
  shares: Record<string, number>;
}

export const EMPTY_EXTRA_UNITS: LeaseExtraUnitsState = {
  enabled: false,
  units: [],
  shareEnabled: false,
  shares: {},
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ids na ordem: principal primeiro, depois adicionais. */
export function leaseUnitIdsFor(primaryId: string, state: LeaseExtraUnitsState): string[] {
  const extras = state.enabled ? state.units.map((u) => u.id).filter((id) => id !== primaryId) : [];
  return [primaryId, ...Array.from(new Set(extras))].filter(Boolean);
}

/** Erro de validação do rateio (null = válido). */
export function validateLeaseShares(primaryId: string, state: LeaseExtraUnitsState): string | null {
  const ids = leaseUnitIdsFor(primaryId, state);
  if (!state.enabled || !state.shareEnabled || ids.length < 2) return null;
  if (ids.some((id) => !(Number(state.shares[id]) > 0))) return "Cada imóvel precisa de um percentual maior que 0.";
  const total = round2(ids.reduce((s, id) => s + (Number(state.shares[id]) || 0), 0));
  if (Math.abs(total - 100) > 0.01) return `O rateio precisa somar 100% (hoje: ${total.toLocaleString("pt-BR")}%).`;
  return null;
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
  primaryUnitId: string;
  primaryLabel: string;
  value: LeaseExtraUnitsState;
  onChange: (v: LeaseExtraUnitsState) => void;
  brokerId: string;
  editLeaseId?: string | null;
}

export function LeaseExtraUnitsSection({ primaryUnitId, primaryLabel, value, onChange, brokerId, editLeaseId }: Props) {
  // Mesma fonte/filtros da seleção principal: imóveis em gestão, de locação
  const { data: options = [], isLoading } = useQuery({
    queryKey: ["lease-extra-unit-options", brokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, is_standalone, tenant_contact_id, property_id, property:properties(name)")
        .eq("broker_id", brokerId)
        .eq("is_managed", true)
        .in("intent_type", ["rental", "both"])
        .order("unit_number");
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        unit_number: u.unit_number,
        is_standalone: u.is_standalone,
        tenant_contact_id: u.tenant_contact_id,
        property_id: u.property_id ?? null,
        property_name: u.property?.name ?? null,
      })) as UnitOption[];
    },
    enabled: !!brokerId && value.enabled,
  });

  const extraIds = value.units.map((u) => u.id);
  const { data: busyIds = [] } = useQuery({
    queryKey: ["lease-extra-units-busy", extraIds.join(","), editLeaseId ?? null],
    queryFn: async () => {
      const res = await Promise.all(
        extraIds.map(async (id) => ((await unitHasOtherLiveLease(id, editLeaseId || NO_LEASE)) ? id : null))
      );
      return res.filter(Boolean) as string[];
    },
    enabled: value.enabled && extraIds.length > 0,
  });

  const ids = leaseUnitIdsFor(primaryUnitId, value);
  const shareError = validateLeaseShares(primaryUnitId, value);
  const total = round2(ids.reduce((s, id) => s + (Number(value.shares[id]) || 0), 0));
  const labelOf = (id: string) =>
    id === primaryUnitId ? primaryLabel : (() => {
      const u = value.units.find((x) => x.id === id);
      return u ? unitLabel(u) : id;
    })();

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
              value={value.units.filter((u) => u.id !== primaryUnitId)}
              onChange={(units) => onChange({ ...value, units })}
              options={options}
              optionsLoading={isLoading}
              excludeIds={primaryUnitId ? [primaryUnitId] : []}
              placeholder="Buscar imóveis adicionais..."
            />
            <p className="text-[11px] text-muted-foreground">
              Imóveis adicionais entram como unidade inteira (sem escolha de fração). O imóvel escolhido acima continua sendo o principal.
            </p>
          </div>

          {busyIds.length > 0 && (
            <Alert className="border-amber-500/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs">
                Já possui outro contrato ativo ou pendente: {busyIds.map(labelOf).join(", ")}. Você pode continuar mesmo assim.
              </AlertDescription>
            </Alert>
          )}

          {ids.length > 1 && (
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
                      shares: checked && Object.keys(value.shares).length === 0 ? equalShares(ids) : value.shares,
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
                  {ids.map((id) => (
                    <div key={id} className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 text-sm truncate">
                        {labelOf(id)}
                        {id === primaryUnitId && <span className="text-xs text-muted-foreground"> (principal)</span>}
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step="0.01"
                        className="w-24 text-base sm:text-sm"
                        value={value.shares[id] ?? ""}
                        onChange={(e) =>
                          onChange({ ...value, shares: { ...value.shares, [id]: parseFloat(e.target.value) || 0 } })
                        }
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <span className={shareError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                      {shareError ?? `Total: ${total.toLocaleString("pt-BR")}%`}
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, shares: equalShares(ids) })}>
                      Dividir igualmente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
