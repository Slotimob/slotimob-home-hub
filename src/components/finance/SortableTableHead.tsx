import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortField, SortOrder } from "@/hooks/useInfiniteTransactions";

interface SortableTableHeadProps {
  field: SortField;
  label: string;
  currentSort: { field: SortField; order: SortOrder } | undefined;
  onSort: (field: SortField) => void;
  className?: string;
}

export function SortableTableHead({ 
  field, 
  label, 
  currentSort, 
  onSort, 
  className 
}: SortableTableHeadProps) {
  const isActive = currentSort?.field === field && currentSort?.order !== null;
  const order = currentSort?.field === field ? currentSort.order : null;

  const handleClick = () => {
    onSort(field);
  };

  return (
    <TableHead 
      className={cn(
        "px-2 text-xs cursor-pointer select-none hover:bg-muted/50 transition-colors",
        isActive && "text-foreground font-semibold",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <div className="w-3 h-3 flex items-center justify-center">
          {order === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : order === "desc" ? (
            <ArrowDown className="h-3 w-3 text-primary" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
      </div>
    </TableHead>
  );
}
