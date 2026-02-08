import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SortOption {
  value: string;
  label: string;
}

interface ActionToolbarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  filterSlot?: React.ReactNode;
  viewModeSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  className?: string;
}

export const ActionToolbar = ({
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  sortOptions,
  sortValue,
  onSortChange,
  filterSlot,
  viewModeSlot,
  actionsSlot,
  className,
}: ActionToolbarProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search - takes remaining space */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort dropdown */}
        {sortOptions && onSortChange && (
          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="w-[160px] flex-shrink-0">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filter button slot */}
        {filterSlot}
      </div>

      {/* Secondary row with view mode and actions */}
      {(viewModeSlot || actionsSlot) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {viewModeSlot}
          </div>
          <div className="flex items-center gap-2">
            {actionsSlot}
          </div>
        </div>
      )}
    </div>
  );
};
