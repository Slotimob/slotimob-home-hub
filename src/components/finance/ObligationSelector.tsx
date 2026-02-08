import { ClipboardList } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { ObligationType, ObligationsConfig } from "@/hooks/useAssetHealth";
 import { SYSTEM_OBLIGATION_TYPES } from "@/hooks/useCustomObligationTypes";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
export interface ObligationOption {
   type: ObligationType;
   label: string;
   dueDay?: number;
   active: boolean;
 }
 
 interface ObligationSelectorProps {
   unitId: string;
   value: ObligationType | null;
   onChange: (value: ObligationType | null, competencyPeriod?: string) => void;
   disabled?: boolean;
 }
 
 export function ObligationSelector({
   unitId,
   value,
   onChange,
   disabled = false,
 }: ObligationSelectorProps) {
   const { data: unitObligations, isLoading } = useQuery({
     queryKey: ["unit-obligations-for-selector", unitId],
     queryFn: async () => {
       if (!unitId) return [];
 
       const { data, error } = await supabase
         .from("units")
         .select("obligations_config, is_managed")
         .eq("id", unitId)
         .single();
 
       if (error) throw error;
 
       // Only show obligations for managed units
       if (!data?.is_managed) return [];
 
       const config = (data?.obligations_config as ObligationsConfig) || {};
 
       // Build options from system obligation types
       const options: ObligationOption[] = SYSTEM_OBLIGATION_TYPES.map((sysType) => {
         const obligationConfig = config[sysType.type];
         return {
           type: sysType.type,
           label: sysType.label,
           dueDay: obligationConfig?.due_day || sysType.defaultDueDay,
           active: obligationConfig?.active ?? false,
         };
       });
 
       // Return only active obligations
       return options.filter((o) => o.active);
     },
     enabled: !!unitId,
   });
 
   // Auto-generate competency period for current month
   const currentCompetency = format(new Date(), "yyyy-MM");
   const currentMonthLabel = format(new Date(), "MMMM/yyyy", { locale: ptBR });
 
  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === "__none__") {
      onChange(null, undefined);
      return;
    }
    const type = selectedValue as ObligationType;
     onChange(type, currentCompetency);
   };
 
   if (!unitObligations || unitObligations.length === 0) {
     return null;
   }
 
  const selectedObligation = unitObligations.find((o) => o.type === value);

   return (
    <Select
      value={value ?? "__none__"}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Vincular a uma obrigação (opcional)">
          {selectedObligation ? (
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedObligation.label}</span>
              <span className="text-muted-foreground text-xs">
                ({currentMonthLabel})
              </span>
            </div>
          ) : (
            "Vincular a uma obrigação (opcional)"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[200]">
        <SelectItem value="__none__">
          <span className="text-muted-foreground">Nenhuma (Limpar)</span>
        </SelectItem>
        {unitObligations.map((obligation) => (
          <SelectItem key={obligation.type} value={obligation.type}>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span>{obligation.label}</span>
                {obligation.dueDay && (
                  <span className="text-xs text-muted-foreground">
                    Vencimento: dia {obligation.dueDay}
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
   );
 }