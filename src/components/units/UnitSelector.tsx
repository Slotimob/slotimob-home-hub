import { unitAvailability, type UnitAvailabilityKind } from '@/lib/unit-availability';
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
  property_id: string | null;
  property_name: string | null;
  /** Disponibilidade considerando frações (opcional para fontes externas). */
  availability_kind?: UnitAvailabilityKind;
}

/** Selo de ocupação exibido ao lado do imóvel nos seletores. */
export function unitOccupancyTag(u: UnitOption): string | null {
  if (u.availability_kind === 'partial') return 'parcialmente alugado';
  if (u.availability_kind === 'available') return null;
  if (u.tenant_contact_id || u.availability_kind === 'rented') return 'ocupado';
  return null;
}

export function useUnitOptions(opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled ?? true;
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('units')
      .select('id, unit_number, is_standalone, tenant_contact_id, property_id, status, has_subdivisions, property:properties(name), unit_subdivisions(status, tenant_contact_id)')
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
            property_id: u.property_id ?? null,
            property_name: u.property?.name ?? null,
            availability_kind: unitAvailability(u, u.unit_subdivisions).kind,
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { units, loading };
}

export function unitLabel(u: UnitOption): string {
  return u.is_standalone ? u.unit_number : `${u.unit_number} — ${u.property_name ?? 'Empreendimento'}`;
}

interface UnitSelectorProps {
  value: string | null;
  onChange: (unit: UnitOption | null) => void;
  placeholder?: string;
}

export const UnitSelector = ({ value, onChange, placeholder = 'Buscar unidade...' }: UnitSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { units, loading } = useUnitOptions();

  const selected = units.find((u) => u.id === value) ?? null;

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
          {selected ? unitLabel(selected) : placeholder}
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
                  value={unitLabel(u)}
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
                  {unitLabel(u)}
                  {unitOccupancyTag(u) && (
                    <span className="ml-auto text-[10px] text-amber-700 dark:text-amber-400">{unitOccupancyTag(u)}</span>
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
