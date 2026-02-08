import { cn } from '@/lib/utils';
import { 
  Building2, 
  Users, 
  Target, 
  Calendar, 
  FileText, 
  Calculator, 
  BarChart3, 
  MessageSquare,
  LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: 'imoveis', label: 'Gestão de Imóveis', icon: Building2 },
  { id: 'leads', label: 'CRM de Leads', icon: Users },
  { id: 'pipeline', label: 'Pipeline de Vendas', icon: Target },
  { id: 'agenda', label: 'Agenda Inteligente', icon: Calendar },
  { id: 'documentos', label: 'Documentos Digitais', icon: FileText },
  { id: 'simuladores', label: 'Simuladores', icon: Calculator },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'integracoes', label: 'Integrações', icon: MessageSquare },
];

interface DemoNavigationProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  className?: string;
}

export function DemoNavigation({ activeSection, onNavigate, className }: DemoNavigationProps) {
  return (
    <nav className={cn("space-y-1 pt-2.5", className)}>
      {navItems.map((item, index) => {
        const isActive = activeSection === item.id;
        const Icon = item.icon;
        
        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
              isActive 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="font-medium text-sm">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary"
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}

// Mobile version with horizontal scroll
export function DemoNavigationMobile({ activeSection, onNavigate }: DemoNavigationProps) {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-2 min-w-max">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
