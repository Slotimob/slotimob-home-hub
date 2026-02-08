import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export interface CompanyFilters {
  state: string | null;
  hasContactPerson: boolean | null;
  hasWebsite: boolean | null;
}

interface CompaniesAdvancedFiltersProps {
  filters: CompanyFilters;
  onFiltersChange: (filters: CompanyFilters) => void;
}

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CompaniesAdvancedFilters = ({ filters, onFiltersChange }: CompaniesAdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = [
    filters.state,
    filters.hasContactPerson !== null,
    filters.hasWebsite !== null,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      state: null,
      hasContactPerson: null,
      hasWebsite: null,
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros Avançados</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* State Filter */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={filters.state || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, state: value === 'all' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Has Contact Person Filter */}
          <div className="space-y-2">
            <Label>Pessoa de Contato</Label>
            <Select
              value={filters.hasContactPerson === null ? 'all' : filters.hasContactPerson.toString()}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                hasContactPerson: value === 'all' ? null : value === 'true' 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Com contato</SelectItem>
                <SelectItem value="false">Sem contato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Has Website Filter */}
          <div className="space-y-2">
            <Label>Website</Label>
            <Select
              value={filters.hasWebsite === null ? 'all' : filters.hasWebsite.toString()}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                hasWebsite: value === 'all' ? null : value === 'true' 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Com website</SelectItem>
                <SelectItem value="false">Sem website</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
