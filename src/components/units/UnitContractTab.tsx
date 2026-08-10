import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, FileSignature, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLeaseByUnitId, type Lease } from '@/hooks/useLeases';
import { formatCurrencyBRL } from '@/utils/unitPricing';
import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active: { label: 'Ativo', variant: 'default' },
  pending: { label: 'Pendente de Configuração', variant: 'secondary' },
  pending_signature: { label: 'Aguardando Assinatura', variant: 'secondary' },
  expired: { label: 'Expirado', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
  terminated: { label: 'Encerrado', variant: 'outline' },
};

interface LeaseWithReview extends Lease {
  needs_tenant_review?: boolean;
  tenant_review_note?: string | null;
}

interface UnitContractTabProps {
  unitId: string;
}

export function UnitContractTab({ unitId }: UnitContractTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: lease, isLoading } = useLeaseByUnitId(unitId);

  const handleMarkReviewed = async () => {
    if (!lease) return;
    const { error } = await supabase
      .from('leases')
      .update({ needs_tenant_review: false })
      .eq('id', lease.id);
    if (error) {
      console.error('Failed to mark lease as reviewed:', error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['lease', 'unit', unitId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lease) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum contrato cadastrado para este imóvel ainda.
          </p>
          <Button onClick={() => navigate(`/gestao/contratos/novo?unitId=${unitId}`)}>
            <FileSignature className="h-4 w-4 mr-2" />
            Criar Contrato
          </Button>
        </CardContent>
      </Card>
    );
  }

  const leaseWithReview = lease as LeaseWithReview;
  const statusConfig = STATUS_LABELS[lease.status] || {
    label: lease.status,
    variant: 'outline',
  };

  return (
    <div className="space-y-4">
      {leaseWithReview.needs_tenant_review && (
        <Alert className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-amber-900 dark:text-amber-100">
              {leaseWithReview.tenant_review_note || 'Este contrato precisa de revisão.'}
            </span>
            <Button size="sm" variant="outline" onClick={handleMarkReviewed}>
              Marcar como Revisado
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {lease.status === 'pending' ? (
        <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold">Contrato Pré-iniciado</h3>
                  <p className="text-sm text-muted-foreground">
                    Inquilino:{' '}
                    <span className="font-medium text-foreground">
                      {lease.tenant?.name || '-'}
                    </span>
                  </p>
                </div>
              </div>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>

            <p className="text-sm text-amber-900 dark:text-amber-100">
              Contrato pré-iniciado automaticamente a partir dos dados do imóvel — falta
              completar as informações (datas, garantia, forma de pagamento) para ativá-lo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor do Aluguel</p>
                <p className="text-sm font-medium">{formatCurrencyBRL(lease.rent_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data de Início</p>
                <p className="text-sm font-medium">
                  {lease.start_date
                    ? format(parseISO(lease.start_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </p>
              </div>
              {lease.next_adjustment_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Próximo Reajuste</p>
                  <p className="text-sm font-medium">
                    {format(parseISO(lease.next_adjustment_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => navigate(`/gestao/contratos/novo?editLeaseId=${lease.id}`)}>
                <FileSignature className="h-4 w-4 mr-2" />
                Finalizar Configuração do Contrato
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Contrato Ativo</h3>
                <p className="text-sm text-muted-foreground">
                  Inquilino:{' '}
                  <span className="font-medium text-foreground">
                    {lease.tenant?.name || '-'}
                  </span>
                </p>
              </div>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor do Aluguel</p>
                <p className="text-sm font-medium">{formatCurrencyBRL(lease.rent_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data de Início</p>
                <p className="text-sm font-medium">
                  {lease.start_date
                    ? format(parseISO(lease.start_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </p>
              </div>
              {lease.next_adjustment_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Próximo Reajuste</p>
                  <p className="text-sm font-medium">
                    {format(parseISO(lease.next_adjustment_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => navigate(`/gestao/contratos?id=${lease.id}`)}>
                Ver Contrato Completo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
