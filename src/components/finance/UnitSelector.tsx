import { useState } from "react";
import { Check, ChevronsUpDown, Home, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UnitOption {
  id: string;
  label: string;
  sublabel?: string;
  isStandalone: boolean;
}

type UnitSelectorProps = {
  placeholder?: string;
  disabled?: boolean;
} & (
  | { values: string[]; onChange: (values: string[]) => void; value?: never }
  | { value: string; onChange: (value: string) => void; values?: never }
);

export function UnitSelector(props: UnitSelectorProps) {
  const { placeholder = "Todas as unidades", disabled = false } = props;
  const isMulti = "values" in props && Array.isArray(props.values);
  const values: string[] = isMulti
    ? (props as { values: string[] }).values
    : (props as { value: string }).value
      ? [(props as { value: string }).value]
      : [];
  const emit = (next: string[]) => {
    if (isMulti) {
      (props as { onChange: (v: string[]) => void }).onChange(next);
    } else {
      (props as { onChange: (v: string) => void }).onChange(next[0] ?? "");
    }
  };
  const [open, setOpen] = useState(false);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units-for-selector"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select(`
          id,
          unit_number,
          is_standalone,
          property_type,
          property:properties(name)
        `)
        .order("unit_number");

      if (error) throw error;

      return (data || []).map((unit): UnitOption => ({
        id: unit.id,
        label: unit.unit_number,
        sublabel: unit.property?.name || (unit.is_standalone ? "Imóvel Avulso" : undefined),
        isStandalone: unit.is_standalone || false,
      }));
    },
  });

  const toggle = (id: string) => {
    if (isMulti) {
      if (values.includes(id)) {
        emit(values.filter((v) => v !== id));
      } else {
        emit([...values, id]);
      }
    } else {
      // Single-select: toggling the same item clears, otherwise replace
      emit(values[0] === id ? [] : [id]);
      setOpen(false);
    }
  };

  const clear = () => {
    emit([]);
    setOpen(false);
  };

  const triggerLabel = () => {
    if (values.length === 0) return null;
    if (values.length === 1) {
      const u = units.find((u) => u.id === values[0]);
      if (!u) return "1 unidade";
      return u.sublabel ? `${u.label} (${u.sublabel})` : u.label;
    }
    return `${values.length} unidades selecionadas`;
  };

  const label = triggerLabel();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between font-normal"
          disabled={disabled || isLoading}
        >
          <span className="truncate text-left flex-1">
            {label ? (
              <span className="text-foreground">{label}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {values.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); clear(); }}
                onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), clear())}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar unidade..." />
          <CommandList className="max-h-[250px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
            <CommandGroup>
              {units.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={`${unit.label} ${unit.sublabel || ""}`}
                  onSelect={() => toggle(unit.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      values.includes(unit.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {unit.isStandalone ? (
                      <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span>{unit.label}</span>
                      {unit.sublabel && (
                        <span className="text-xs text-muted-foreground">
                          {unit.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
