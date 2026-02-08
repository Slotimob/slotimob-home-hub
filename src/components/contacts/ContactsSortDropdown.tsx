import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortField = 'name' | 'created_at' | 'email' | 'city';
export type SortDirection = 'asc' | 'desc';

interface ContactsSortDropdownProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Nome' },
  { field: 'created_at', label: 'Data de criação' },
  { field: 'email', label: 'E-mail' },
  { field: 'city', label: 'Cidade' },
];

export const ContactsSortDropdown = ({
  sortField,
  sortDirection,
  onSortChange,
}: ContactsSortDropdownProps) => {
  const currentLabel = SORT_OPTIONS.find(o => o.field === sortField)?.label || 'Nome';
  const Icon = sortDirection === 'asc' ? ArrowUp : ArrowDown;

  const handleClick = (field: SortField) => {
    if (field === sortField) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLabel}</span>
          <Icon className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.field}
            onClick={() => handleClick(option.field)}
            className="gap-2"
          >
            {option.label}
            {sortField === option.field && (
              <Icon className="h-3 w-3 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
