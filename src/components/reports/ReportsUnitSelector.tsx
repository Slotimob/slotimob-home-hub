import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface UnitOption {
  id: string;
  label: string;
  propertyName?: string;
  isStandalone: boolean;
}

interface ReportsUnitSelectorProps {
  selectedUnitId: string | null;
  onUnitChange: (unitId: string | null) => void;
}

export const ReportsUnitSelector = ({ selectedUnitId, onUnitChange }: ReportsUnitSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('units')
          .select(`
            id,
            unit_number,
            is_standalone,
            property:properties(name)
          `)
          .eq('broker_id', user.id)
          .order('unit_number');

        const options: UnitOption[] = (data || []).map(u => ({
          id: u.id,
          label: u.is_standalone 
            ? u.unit_number || 'Imóvel Avulso'
            : `${u.unit_number || 'Unidade'} - ${u.property?.name || 'Sem empreendimento'}`,
          propertyName: u.property?.name || undefined,
          isStandalone: u.is_standalone || false,
        }));

        setUnits(options);
      } catch (error) {
        console.error('Error fetching units:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, []);

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between h-9 min-w-[180px] max-w-[280px]"
          disabled={loading}
        >
          <Building2 className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {loading 
              ? 'Carregando...' 
              : selectedUnit 
                ? selectedUnit.label 
                : 'Todas as Unidades'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar unidade..." />
          <CommandList>
            <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onUnitChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selectedUnitId ? "opacity-100" : "opacity-0"
                  )}
                />
                Todas as Unidades
              </CommandItem>
              {units.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={unit.label}
                  onSelect={() => {
                    onUnitChange(unit.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUnitId === unit.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{unit.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
