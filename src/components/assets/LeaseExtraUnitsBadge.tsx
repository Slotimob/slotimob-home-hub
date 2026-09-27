import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface LeaseWithUnits {
  unit_id?: string | null;
  lease_units?: {
    unit_id: string;
    is_primary: boolean;
    unit: { unit_number: string | null; property: { name: string } | null } | null;
  }[] | null;
}

/** Imóveis adicionais (não principais) de um contrato. */
export function extraLeaseUnits(lease: LeaseWithUnits) {
  return (lease.lease_units || []).filter((lu) => !lu.is_primary && lu.unit_id !== lease.unit_id);
}

export function ExtraUnitsBadge({ lease }: { lease: LeaseWithUnits }) {
  const extras = extraLeaseUnits(lease);
  if (!extras.length) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 cursor-default">
            +{extras.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium mb-1">Outros imóveis deste contrato</p>
          {extras.map((lu) => (
            <p key={lu.unit_id} className="text-xs">
              {[lu.unit?.property?.name, lu.unit?.unit_number].filter(Boolean).join(" — ") || "Imóvel"}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

