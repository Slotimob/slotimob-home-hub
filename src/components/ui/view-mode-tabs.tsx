import * as React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, Columns, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'kanban' | 'table';

interface ViewModeTabsProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  className?: string;
  showKanban?: boolean;
  showTable?: boolean;
}

export const ViewModeTabs = ({ 
  value, 
  onValueChange, 
  className,
  showKanban = true,
  showTable = false,
}: ViewModeTabsProps) => {
  return (
    <Tabs 
      value={value} 
      onValueChange={(v) => onValueChange(v as ViewMode)}
      className={cn('', className)}
    >
      <TabsList className="h-10 p-1 bg-muted/50">
        {showKanban && (
          <TabsTrigger 
            value="kanban" 
            className="gap-2 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            title="Visualização por Status"
            aria-label="Visualização por Status"
          >
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Por Status</span>
          </TabsTrigger>
        )}
        <TabsTrigger 
          value="grid" 
          className="gap-2 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Grade</span>
        </TabsTrigger>
        {showTable && (
          <TabsTrigger 
            value="table" 
            className="gap-2 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
};
