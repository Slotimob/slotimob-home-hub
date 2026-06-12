import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, Briefcase, Wallet, ScrollText, Loader2 } from 'lucide-react';
import type { LinkedResources } from '@/hooks/useContactLinkedResources';

interface ContactLinkedResourcesProps {
  resources: LinkedResources;
  isLoading: boolean;
}

export const ContactLinkedResources = ({ resources, isLoading }: ContactLinkedResourcesProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando vínculos...</span>
        </CardContent>
      </Card>
    );
  }

  const hasAny = 
    resources.units.length > 0 || 
    resources.leases.length > 0 || 
    resources.deals.length > 0 || 
    resources.proposals.length > 0 || 
    resources.transactions.length > 0;

  if (!hasAny) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">Nenhum vínculo encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Vínculos no Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-0 pb-4">
        {/* Units */}
        {resources.units.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Imóveis ({resources.units.length})
            </div>
            <div className="flex flex-wrap gap-1 ml-5">
              {resources.units.map(u => (
                <Badge key={u.id} variant="secondary" className="text-xs">
                  {u.unit_number}{u.property_name ? ` - ${u.property_name}` : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Leases */}
        {resources.leases.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
              Contratos ({resources.leases.length})
            </div>
            <div className="flex flex-wrap gap-1 ml-5">
              {resources.leases.map(l => (
                <Badge key={l.id} variant="secondary" className="text-xs">
                  {l.unit_number || 'Contrato'} · {l.status}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Deals */}
        {resources.deals.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              Negociações ({resources.deals.length})
            </div>
            <div className="flex flex-wrap gap-1 ml-5">
              {resources.deals.map(d => (
                <Badge key={d.id} variant="secondary" className="text-xs">
                  {d.title || d.stage}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Proposals */}
        {resources.proposals.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Propostas ({resources.proposals.length})
            </div>
            <div className="flex flex-wrap gap-1 ml-5">
              {resources.proposals.map(p => (
                <Badge key={p.id} variant="secondary" className="text-xs">
                  {p.lead_name || 'Proposta'} · {p.status === 'sent' ? 'Enviada' : 'Rascunho'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        {resources.transactions.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              Transações ({resources.transactions.length})
            </div>
            <div className="flex flex-wrap gap-1 ml-5">
              {resources.transactions.map(t => (
                <Badge key={t.id} variant="secondary" className="text-xs truncate max-w-[200px]">
                  {t.description}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
