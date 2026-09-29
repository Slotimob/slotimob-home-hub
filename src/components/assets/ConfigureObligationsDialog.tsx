import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ObligationsConfigForm } from "./ObligationsConfigForm";

interface ConfigureObligationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string | null;
  unitName: string;
  onSaved?: () => void;
  /** Quando informado e o contrato tiver vários imóveis, mostra seletor. */
  leaseId?: string | null;
  /** Avisos automáticos do contrato ligados (billing_automation.enabled). */
  billingRemindersEnabled?: boolean;
}

interface LeaseUnitOption {
  unitId: string;
  label: string;
}

export function ConfigureObligationsDialog({
  open,
  onOpenChange,
  unitId,
  unitName,
  onSaved,
  leaseId,
  billingRemindersEnabled,
}: ConfigureObligationsDialogProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(unitId);

  useEffect(() => {
    if (open) setSelectedUnitId(unitId);
  }, [open, unitId]);

  const { data: options } = useQuery({
    queryKey: ["lease-units-obligations-options", leaseId, unitId],
    enabled: open && !!leaseId,
    queryFn: async (): Promise<LeaseUnitOption[]> => {
      const { data } = await supabase
        .from("lease_units")
        .select("unit_id, is_primary, unit_subdivision_id, units(unit_number), unit_subdivisions(label)")
        .eq("lease_id", leaseId as string);
      const map = new Map<string, LeaseUnitOption>();
      if (unitId) map.set(unitId, { unitId, label: `${unitName || "Imóvel"} (principal)` });
      const rows = ((data as any[]) || []).sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
      for (const r of rows) {
        const existing = map.get(r.unit_id);
        const name = r.units?.unit_number || "Imóvel";
        const frac = r.unit_subdivisions?.label;
        if (existing) {
          if (frac && !existing.label.includes(frac)) existing.label += ` · fração ${frac}`;
          continue;
        }
        map.set(r.unit_id, {
          unitId: r.unit_id,
          label: frac ? `${name} (fração ${frac})` : `${name}${r.is_primary ? " (principal)" : " (adicional)"}`,
        });
      }
      return Array.from(map.values());
    },
  });

  const activeUnitId = selectedUnitId ?? unitId;
  const activeName = options?.find((o) => o.unitId === activeUnitId)?.label ?? unitName;
  const showSelector = (options?.length ?? 0) > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Matriz de Responsabilidades</DialogTitle>
          <DialogDescription>
            Configure quem é responsável por cada despesa do imóvel{" "}
            <span className="font-medium">{activeName}</span>
          </DialogDescription>
        </DialogHeader>

        {showSelector && (
          <div className="space-y-1.5">
            <Label>Imóvel do contrato</Label>
            <Select value={activeUnitId ?? undefined} onValueChange={setSelectedUnitId}>
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder="Selecione o imóvel" />
              </SelectTrigger>
              <SelectContent>
                {options!.map((o) => (
                  <SelectItem key={o.unitId} value={o.unitId}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="py-4">
          <ObligationsConfigForm
            key={activeUnitId ?? "none"}
            unitId={activeUnitId}
            unitName={activeName}
            billingRemindersEnabled={billingRemindersEnabled}
            onSaved={() => {
              onSaved?.();
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
