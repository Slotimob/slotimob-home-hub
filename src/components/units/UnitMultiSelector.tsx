import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Home, X, Check } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useUnitOptions, unitLabel, type UnitOption } from './UnitSelector';

interface UnitMultiSelectorProps {
  value: UnitOption[];
  onChange: (units: UnitOption[]) => void;
  placeholder?: string;
}

export const UnitMultiSelector = ({ value, onChange, placeholder = 'Buscar unidades...' }: UnitMultiSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { units, loading } = useUnitOptions();

  const isSelected = (id: string) => value.some((u) => u.id === id);

  const toggleUnit = (unit: UnitOption) => {
    if (isSelected(unit.id)) {
      onChange(value.filter((u) => u.id !== unit.id));
    } else {
      onChange([...value, unit]);
    }
  };

  const removeUnit = (id: string) => {
    onChange(value.filter((u) => u.id !== id));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value.length > 0
              ? `${value.length} unidade${value.length > 1 ? 's' : ''} selecionada${value.length > 1 ? 's' : ''}`
              : placeholder}
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
              <CommandGroup>
                {units.map((u) => {
                  const selected = isSelected(u.id);
                  return (
                    <CommandItem
                      key={u.id}
                      value={unitLabel(u)}
                      onSelect={() => toggleUnit(u)}
                      className="cursor-pointer"
                    >
                      <div
                        className={cn(
                          'mr-2 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                          selected ? 'bg-primary border-primary' : 'border-input'
                        )}
                      >
                        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {u.is_standalone ? (
                        <Home className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{unitLabel(u)}</span>
                      {u.tenant_contact_id && !selected && (
                        <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400 flex-shrink-0">
                          ocupado
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((u) => (
            <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
              {unitLabel(u)}
              <button
                type="button"
                onClick={() => removeUnit(u.id)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remover ${unitLabel(u)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
