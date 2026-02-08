import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Search, 
  AlertCircle, 
  WifiOff, 
  RefreshCw, 
  Plus,
  type LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateType = "no-data" | "no-results" | "error" | "offline";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

const DEFAULT_CONFIGS: Record<EmptyStateType, { icon: LucideIcon; title: string; description: string }> = {
  "no-data": {
    icon: FileText,
    title: "Nenhum registro encontrado",
    description: "Adicione seu primeiro registro para começar.",
  },
  "no-results": {
    icon: Search,
    title: "Nenhum resultado encontrado",
    description: "Tente ajustar os filtros ou termos de busca.",
  },
  "error": {
    icon: AlertCircle,
    title: "Erro ao carregar dados",
    description: "Ocorreu um problema ao carregar as informações. Tente novamente.",
  },
  "offline": {
    icon: WifiOff,
    title: "Sem conexão",
    description: "Verifique sua conexão com a internet e tente novamente.",
  },
};

export function EmptyState({
  type = "no-data",
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  const config = DEFAULT_CONFIGS[type];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  const isError = type === "error" || type === "offline";

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div 
          className={cn(
            "rounded-full p-3 mb-4",
            isError ? "bg-destructive/10" : "bg-muted"
          )}
        >
          <Icon 
            className={cn(
              "h-8 w-8",
              isError ? "text-destructive" : "text-muted-foreground"
            )} 
          />
        </div>
        
        <h3 className="font-semibold text-lg mb-1">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {displayDescription}
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {onAction && (
            <Button 
              onClick={onAction}
              variant={isError ? "outline" : "default"}
              size="sm"
            >
              {isError && <RefreshCw className="h-4 w-4 mr-2" />}
              {!isError && actionLabel?.toLowerCase().includes("adicionar") && (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {actionLabel || (isError ? "Tentar Novamente" : "Adicionar")}
            </Button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <Button 
              onClick={onSecondaryAction}
              variant="ghost"
              size="sm"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
