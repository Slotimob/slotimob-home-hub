import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Search, Building2, Home } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface UnitOption {
  id: string;
  unit_number: string;
  is_standalone: boolean;
  tenant_contact_id: string | null;
  property_name: string | null;
}

interface UnitSelectorProps {
  value: string | null;
  onChange: (unit: UnitOption | null) => void;
  placeholder?: string;
}

export const UnitSelector = ({ value, onChange, placeholder = 'Buscar unidade...' }: UnitSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('units')
      .select('id, unit_number, is_standalone, tenant_contact_id, property:properties(name)')
      .order('unit_number')
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error || !data) return;
        setUnits(
          (data as any[]).map((u) => ({
            id: u.id,
            unit_number: u.unit_number,
            is_standalone: u.is_standalone,
            tenant_contact_id: u.tenant_contact_id,
            property_name: u.property?.name ?? null,
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = units.find((u) => u.id === value) ?? null;

  const label = (u: UnitOption) =>
    u.is_standalone ? u.unit_number : `${u.unit_number} — ${u.property_name ?? 'Empreendimento'}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? label(selected) : placeholder}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar por número ou empreendimento..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{loading ? 'Carregando...' : 'Nenhuma unidade encontrada.'}</CommandEmpty>
            {value && (
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="cursor-pointer text-muted-foreground"
                >
                  Limpar seleção
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {units.map((u) => (
                <CommandItem
                  key={u.id}
                  value={label(u)}
                  onSelect={() => {
                    onChange(u);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="cursor-pointer"
                >
                  {u.is_standalone ? (
                    <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  )}
                  {label(u)}
                  {u.tenant_contact_id && (
                    <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-400">ocupado</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
