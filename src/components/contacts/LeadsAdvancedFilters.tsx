import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X } from 'lucide-react';

export interface LeadFilters {
  origin: string | null;
  interestTypes: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  dealStage: string | null;
}

interface LeadsAdvancedFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
}

const ORIGIN_OPTIONS = [
  { value: 'site', label: 'Site' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'portal', label: 'Portal' },
  { value: 'campanha', label: 'Campanha' },
  { value: 'redes_sociais', label: 'Redes Sociais' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
  { value: 'outro', label: 'Outro' },
];

const INTEREST_OPTIONS = [
  { value: 'venda', label: 'Venda' },
  { value: 'locacao', label: 'Locação' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'temporada', label: 'Temporada' },
];

const DEAL_STAGE_OPTIONS = [
  { value: 'new_lead', label: 'Novo Lead' },
  { value: 'in_contact', label: 'Em Contato' },
  { value: 'visit_scheduled', label: 'Visita Agendada' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perdido' },
  { value: 'no_deal', label: 'Sem Deal' },
];

export const LeadsAdvancedFilters = ({ filters, onFiltersChange }: LeadsAdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = [
    filters.origin,
    filters.interestTypes.length > 0,
    filters.budgetMin,
    filters.budgetMax,
    filters.dealStage,
  ].filter(Boolean).length;

  const handleInterestToggle = (interest: string) => {
    const newInterests = filters.interestTypes.includes(interest)
      ? filters.interestTypes.filter(i => i !== interest)
      : [...filters.interestTypes, interest];
    onFiltersChange({ ...filters, interestTypes: newInterests });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      origin: null,
      interestTypes: [],
      budgetMin: null,
      budgetMax: null,
      dealStage: null,
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
      <PopoverContent className="w-80" align="end">
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

          {/* Deal Stage Filter */}
          <div className="space-y-2">
            <Label>Estágio do Pipeline</Label>
            <Select
              value={filters.dealStage || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, dealStage: value === 'all' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os estágios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estágios</SelectItem>
                {DEAL_STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Origin Filter */}
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select
              value={filters.origin || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, origin: value === 'all' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {ORIGIN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interest Type Filter */}
          <div className="space-y-2">
            <Label>Tipo de Interesse</Label>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`interest-${option.value}`}
                    checked={filters.interestTypes.includes(option.value)}
                    onCheckedChange={() => handleInterestToggle(option.value)}
                  />
                  <label
                    htmlFor={`interest-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Filter */}
          <div className="space-y-2">
            <Label>Orçamento</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Mínimo"
                  value={filters.budgetMin || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    budgetMin: e.target.value ? parseFloat(e.target.value) : null,
                  })}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Máximo"
                  value={filters.budgetMax || ''}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    budgetMax: e.target.value ? parseFloat(e.target.value) : null,
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
