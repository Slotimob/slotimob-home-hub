import { Building2, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AssetHealthEmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
}

export function AssetHealthEmptyState({ hasFilters, onClearFilters }: AssetHealthEmptyStateProps) {
  if (hasFilters) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Nenhum ativo encontrado
          </h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Não encontramos ativos que correspondam aos filtros aplicados.
            Tente ajustar a busca ou limpar os filtros.
          </p>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Nenhum ativo com gestão ativada
        </h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          Ative a opção <strong>"Habilitar Gestão de Ativo"</strong> nos cadastros 
          de unidades ou imóveis avulsos para começar a monitorá-los aqui.
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Acesse <strong>Empreendimentos → Unidades</strong> ou <strong>Imóveis Avulsos</strong> 
          e edite o ativo desejado para ativar a gestão.
        </p>
      </CardContent>
    </Card>
  );
}
