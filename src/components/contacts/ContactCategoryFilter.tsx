import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Home, Users, Building2, Truck, Shield, Handshake } from 'lucide-react';

export type ContactCategory = 
  | 'Proprietário' 
  | 'Inquilino' 
  | 'Lead' 
  | 'Empresa' 
  | 'Fornecedor' 
  | 'Fiador' 
  | 'Parceiro';

export const CONTACT_CATEGORIES: ContactCategory[] = [
  'Proprietário',
  'Inquilino', 
  'Lead',
  'Empresa',
  'Fornecedor',
  'Fiador',
  'Parceiro',
];

export const CATEGORY_ICONS: Record<ContactCategory, React.ComponentType<{ className?: string }>> = {
  'Proprietário': User,
  'Inquilino': Home,
  'Lead': Users,
  'Empresa': Building2,
  'Fornecedor': Truck,
  'Fiador': Shield,
  'Parceiro': Handshake,
};

export const CATEGORY_COLORS: Record<ContactCategory, string> = {
  'Proprietário': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Inquilino': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Lead': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Empresa': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Fornecedor': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Fiador': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'Parceiro': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

interface ContactCategoryFilterProps {
  selectedCategory: ContactCategory | null;
  onCategoryChange: (category: ContactCategory | null) => void;
  counts?: Record<ContactCategory, number>;
}

export const ContactCategoryFilter = ({
  selectedCategory,
  onCategoryChange,
  counts,
}: ContactCategoryFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={selectedCategory === null ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer transition-colors',
          selectedCategory === null && 'bg-primary text-primary-foreground'
        )}
        onClick={() => onCategoryChange(null)}
      >
        Todos
        {counts && (
          <span className="ml-1.5 text-xs opacity-70">
            {Object.values(counts).reduce((a, b) => a + b, 0)}
          </span>
        )}
      </Badge>
      {CONTACT_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category];
        const isSelected = selectedCategory === category;
        const count = counts?.[category] || 0;
        
        return (
          <Badge
            key={category}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors gap-1',
              isSelected && CATEGORY_COLORS[category]
            )}
            onClick={() => onCategoryChange(isSelected ? null : category)}
          >
            <Icon className="h-3 w-3" />
            {category}
            {counts && (
              <span className="ml-1 text-xs opacity-70">
                {count}
              </span>
            )}
          </Badge>
        );
      })}
    </div>
  );
};

export const ContactCategoryBadges = ({ 
  categories,
  size = 'sm' 
}: { 
  categories: string[];
  size?: 'sm' | 'default';
}) => {
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((cat) => {
        const category = cat as ContactCategory;
        const Icon = CATEGORY_ICONS[category];
        
        return (
          <Badge
            key={category}
            variant="secondary"
            className={cn(
              'gap-1',
              size === 'sm' && 'text-xs py-0',
              CATEGORY_COLORS[category]
            )}
          >
            {Icon && <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
            {category}
          </Badge>
        );
      })}
    </div>
  );
};
