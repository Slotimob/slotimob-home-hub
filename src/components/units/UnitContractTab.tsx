import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, FileSignature, AlertTriangle, AlertCircle, Loader2, Link2, Layers } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLeasesByUnitId, type Lease } from '@/hooks/useLeases';
import { formatCurrencyBRL } from '@/utils/unitPricing';
import { supabase } from '@/integrations/supabase/client';
import { LeaseLinkSelector } from '@/components/units/LeaseLinkSelector';
import { LEASE_STATUS_LABELS } from '@/lib/lease-status';

interface LeaseWithReview extends Lease {
  needs_tenant_review?: boolean;
  tenant_review_note?: string | null;
  unit_subdivision_id?: string | null;
  subdivision?: { id: string; label: string; area: number | null } | null;
}

interface UnitContractTabProps {
  unitId: string;
}

export function UnitContractTab({ unitId }: UnitContractTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: leases = [], isLoading } = useLeasesByUnitId(unitId);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leases', 'unit', unitId] });
    queryClient.invalidateQueries({ queryKey: ['lease', 'unit', unitId] });
  };

  const handleMarkReviewed = async (leaseId: string) => {
    const { error } = await supabase
      .from('leases')
      .update({ needs_tenant_review: false })
      .eq('id', leaseId);
    if (error) {
      console.error('Failed to mark lease as reviewed:', error);
      return;
    }
    invalidate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const linkSelector = (
    <LeaseLinkSelector
      open={linkDialogOpen}
      onOpenChange={setLinkDialogOpen}
      unitId={unitId}
      onLinked={invalidate}
    />
  );

  if (leases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum contrato cadastrado para este imóvel ainda.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => navigate(`/gestao/contratos/novo?unitId=${unitId}`)}>
              <FileSignature className="h-4 w-4 mr-2" />
              Criar Contrato
            </Button>
            <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Vincular a Contrato Existente
            </Button>
          </div>
          {linkSelector}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {leases.length} contrato{leases.length > 1 ? 's' : ''} vinculado
          {leases.length > 1 ? 's' : ''} a este imóvel
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Vincular a Contrato Existente
          </Button>
          <Button onClick={() => navigate(`/gestao/contratos/novo?unitId=${unitId}`)}>
            <FileSignature className="h-4 w-4 mr-2" />
            Gerar Novo Contrato
          </Button>
        </div>
      </div>

      {linkSelector}

      {(leases as LeaseWithReview[]).map((lease) => {
        const statusConfig = LEASE_STATUS_LABELS[lease.status] || {
          label: lease.status,
          variant: 'outline' as const,
        };
        const fracao = lease.subdivision?.label;

        const details = (
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
        );

        const fracaoBadge = fracao ? (
          <Badge variant="outline" className="w-fit">
            <Layers className="h-3 w-3 mr-1" />
            {fracao}
          </Badge>
        ) : null;

        return (
          <div key={lease.id} className="space-y-3">
            {lease.needs_tenant_review && (
              <Alert className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-amber-900 dark:text-amber-100">
                    {lease.tenant_review_note || 'Este contrato precisa de revisão.'}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleMarkReviewed(lease.id)}>
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
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Contrato Pré-iniciado</h3>
                        <p className="text-sm text-muted-foreground">
                          Inquilino:{' '}
                          <span className="font-medium text-foreground">
                            {lease.tenant?.name || '-'}
                          </span>
                        </p>
                        {fracaoBadge}
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </div>

                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    Contrato pré-iniciado automaticamente a partir dos dados do imóvel — falta
                    completar as informações (datas, garantia, forma de pagamento) para ativá-lo.
                  </p>

                  {details}

                  <div className="flex justify-end pt-2">
                    <Button onClick={() => navigate(`/gestao/contratos/novo?edit=${lease.id}`)}>
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
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">Contrato Ativo</h3>
                      <p className="text-sm text-muted-foreground">
                        Inquilino:{' '}
                        <span className="font-medium text-foreground">
                          {lease.tenant?.name || '-'}
                        </span>
                      </p>
                      {fracaoBadge}
                    </div>
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </div>

                  {details}

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
      })}
    </div>
  );
}
