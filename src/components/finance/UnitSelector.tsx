import { useState } from "react";
import { Check, ChevronsUpDown, Home, Building2 } from "lucide-react";
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

interface UnitSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UnitSelector({ 
  value, 
  onChange, 
  placeholder = "Selecione uma unidade (opcional)",
  disabled = false 
}: UnitSelectorProps) {
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

  const selectedUnit = units.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || isLoading}
        >
          {selectedUnit ? (
            <div className="flex items-center gap-2 truncate">
              {selectedUnit.isStandalone ? (
                <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{selectedUnit.label}</span>
              {selectedUnit.sublabel && (
                <span className="text-muted-foreground text-xs truncate">
                  ({selectedUnit.sublabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar unidade..." />
          <CommandList>
            <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">Nenhuma (Limpar)</span>
              </CommandItem>
              {units.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={`${unit.label} ${unit.sublabel || ""}`}
                  onSelect={() => {
                    onChange(unit.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === unit.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {unit.isStandalone ? (
                      <Home className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
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
