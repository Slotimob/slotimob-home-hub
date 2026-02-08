import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DimobQuickResolveDialog, ResolveType } from './DimobQuickResolveDialog';

interface DimobValidation {
  id: string;
  label: string;
  status: 'ok' | 'pending' | 'error';
  message: string;
  resolveType?: ResolveType;
  contactId?: string | null;
  contactName?: string | null;
}

interface DimobStatusCardProps {
  unitId: string;
  cib?: string | null;
  onFocusField?: (fieldName: string) => void;
  onEditUnit?: () => void;
  onCreateLease?: () => void;
}

export const DimobStatusCard = ({ unitId, onEditUnit, onCreateLease }: DimobStatusCardProps) => {
  const [validations, setValidations] = useState<DimobValidation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overallStatus, setOverallStatus] = useState<'ok' | 'pending' | 'error'>('pending');
  
  // Quick resolve dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedResolve, setSelectedResolve] = useState<{
    type: ResolveType;
    contactId?: string | null;
    contactName?: string | null;
  } | null>(null);

  useEffect(() => {
    if (unitId) {
      checkDimobCompliance();
    }
  }, [unitId]);

  const checkDimobCompliance = async () => {
    setIsLoading(true);
    const checks: DimobValidation[] = [];

    try {
      // 1. Fetch unit data with CIB
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('id, cib, owner_contact_id, tenant_contact_id, registration_number, iptu_number')
        .eq('id', unitId)
        .single();

      if (unitError || !unit) {
        setValidations([{
          id: 'unit',
          label: 'Dados do Imóvel',
          status: 'error',
          message: 'Não foi possível carregar os dados do imóvel'
        }]);
        setOverallStatus('error');
        setIsLoading(false);
        return;
      }

      // Check CIB (primary fiscal identifier)
      checks.push({
        id: 'cib',
        label: 'Número CIB',
        status: unit.cib ? 'ok' : 'pending',
        message: unit.cib 
          ? `CIB cadastrado: ${unit.cib}` 
          : 'Número CIB não informado (obrigatório para DIMOB)',
        resolveType: 'cib',
      });

      // Check Registration Number
      checks.push({
        id: 'registration',
        label: 'Matrícula do Imóvel',
        status: unit.registration_number ? 'ok' : 'pending',
        message: unit.registration_number 
          ? `Matrícula: ${unit.registration_number}` 
          : 'Número de matrícula não informado',
        resolveType: 'registration',
      });

      // 2. Check owner document
      if (unit.owner_contact_id) {
        const { data: owner } = await supabase
          .from('contacts')
          .select('name, document_type, document_number')
          .eq('id', unit.owner_contact_id)
          .single();

        if (owner) {
          const hasValidDoc = owner.document_number && owner.document_number.length >= 11;
          checks.push({
            id: 'owner',
            label: 'Documento do Proprietário',
            status: hasValidDoc ? 'ok' : 'pending',
            message: hasValidDoc 
              ? `${owner.name} - ${owner.document_type || 'CPF'}: ${owner.document_number}` 
              : `${owner.name} - CPF/CNPJ não cadastrado`,
            resolveType: 'owner_document',
            contactId: unit.owner_contact_id,
            contactName: owner.name,
          });
        }
      } else {
        checks.push({
          id: 'owner',
          label: 'Proprietário',
          status: 'pending',
          message: 'Nenhum proprietário vinculado ao imóvel',
          resolveType: 'owner_document',
          contactId: null,
          contactName: null,
        });
      }

      // 3. Check tenant document (if there's an active lease)
      const { data: activeLease } = await supabase
        .from('leases')
        .select(`
          id, 
          rent_amount, 
          gross_rent_value,
          administration_fee_value,
          is_dimob_eligible,
          tenant_contact_id
        `)
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .single();

      if (activeLease) {
        // Check tenant document
        if (activeLease.tenant_contact_id) {
          const { data: tenant } = await supabase
            .from('contacts')
            .select('name, document_type, document_number')
            .eq('id', activeLease.tenant_contact_id)
            .single();

          if (tenant) {
            const hasValidDoc = tenant.document_number && tenant.document_number.length >= 11;
            checks.push({
              id: 'tenant',
              label: 'Documento do Inquilino',
              status: hasValidDoc ? 'ok' : 'pending',
              message: hasValidDoc 
                ? `${tenant.name} - ${tenant.document_type || 'CPF'}: ${tenant.document_number}` 
                : `${tenant.name} - CPF/CNPJ não cadastrado`,
              resolveType: 'tenant_document',
              contactId: activeLease.tenant_contact_id,
              contactName: tenant.name,
            });
          }
        }

        // Check lease values
        const hasValues = activeLease.rent_amount > 0 || (activeLease.gross_rent_value && activeLease.gross_rent_value > 0);
        checks.push({
          id: 'lease_values',
          label: 'Valores do Contrato',
          status: hasValues ? 'ok' : 'pending',
          message: hasValues 
            ? `Aluguel: R$ ${(activeLease.gross_rent_value || activeLease.rent_amount || 0).toLocaleString('pt-BR')}` 
            : 'Valores do contrato não definidos',
          resolveType: 'lease',
        });

        // Check DIMOB eligibility flag
        checks.push({
          id: 'dimob_flag',
          label: 'Elegível DIMOB',
          status: activeLease.is_dimob_eligible !== false ? 'ok' : 'pending',
          message: activeLease.is_dimob_eligible !== false 
            ? 'Imóvel marcado como elegível para DIMOB' 
            : 'Imóvel marcado como NÃO elegível para DIMOB'
        });
      } else {
        checks.push({
          id: 'lease',
          label: 'Contrato Ativo',
          status: 'pending',
          message: 'Nenhum contrato de locação ativo encontrado',
          resolveType: 'lease',
        });
      }

      setValidations(checks);
      
      // Calculate overall status
      const hasError = checks.some(c => c.status === 'error');
      const hasPending = checks.some(c => c.status === 'pending');
      setOverallStatus(hasError ? 'error' : hasPending ? 'pending' : 'ok');

    } catch (error) {
      console.error('Error checking DIMOB compliance:', error);
      setValidations([{
        id: 'error',
        label: 'Erro',
        status: 'error',
        message: 'Erro ao verificar conformidade DIMOB'
      }]);
      setOverallStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = (validation: DimobValidation) => {
    if (!validation.resolveType) return;
    
    setSelectedResolve({
      type: validation.resolveType,
      contactId: validation.contactId,
      contactName: validation.contactName,
    });
    setResolveDialogOpen(true);
  };

  const handleResolveSuccess = () => {
    checkDimobCompliance();
  };

  const getStatusIcon = (status: 'ok' | 'pending' | 'error') => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = () => {
    switch (overallStatus) {
      case 'ok':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100">Apto para DIMOB</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">Pendências</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  const pendingCount = validations.filter(v => v.status === 'pending').length;
  const okCount = validations.filter(v => v.status === 'ok').length;

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground">Verificando conformidade...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={overallStatus === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : overallStatus === 'pending' ? 'border-amber-200 bg-amber-50/50' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Status DIMOB</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Checklist de conformidade fiscal para declaração DIMOB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overallStatus === 'ok' && (
            <Alert className="bg-emerald-100 border-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <AlertDescription className="text-emerald-800">
                Todos os dados obrigatórios estão preenchidos. Este imóvel está apto para a declaração DIMOB.
              </AlertDescription>
            </Alert>
          )}

          {pendingCount > 0 && (
            <Alert className="bg-amber-100 border-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-800">
                {pendingCount} {pendingCount === 1 ? 'pendência encontrada' : 'pendências encontradas'}. 
                Complete os dados para garantir a conformidade fiscal.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 mt-4">
            {validations.map((validation) => (
              <div 
                key={validation.id}
                className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {getStatusIcon(validation.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{validation.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {validation.message}
                    </p>
                  </div>
                </div>
                {validation.status === 'pending' && validation.resolveType && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleResolve(validation)}
                    className="shrink-0 text-xs h-7"
                  >
                    Resolver
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>{okCount} de {validations.length} requisitos atendidos</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkDimobCompliance}
              className="text-xs h-7"
            >
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Resolve Dialog */}
      <DimobQuickResolveDialog
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
        resolveType={selectedResolve?.type || null}
        unitId={unitId}
        contactId={selectedResolve?.contactId}
        contactName={selectedResolve?.contactName}
        onSuccess={handleResolveSuccess}
        onCreateLease={onCreateLease}
        onEditUnit={onEditUnit}
      />
    </>
  );
};

export default DimobStatusCard;
