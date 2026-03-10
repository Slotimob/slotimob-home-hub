import { useState } from 'react';
import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { FileWarning, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ReportsFiscalSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsFiscalSection = ({ dateRange, userName, selectedUnitId }: ReportsFiscalSectionProps) => {
  const { toast } = useToast();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateDimobData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const errors: string[] = [];

    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, cpf_cnpj');

    const leadsWithoutCpf = (leads || []).filter(l => !l.cpf_cnpj);
    if (leadsWithoutCpf.length > 0) {
      errors.push(`${leadsWithoutCpf.length} lead(s) sem CPF/CNPJ cadastrado`);
    }

    let leasesQuery = supabase
      .from('leases')
      .select(`
        id,
        tenant:contacts!leases_tenant_contact_id_fkey(name, document_number)
      `)
      .eq('status', 'active');

    if (selectedUnitId) {
      leasesQuery = leasesQuery.eq('unit_id', selectedUnitId);
    }

    const { data: leases } = await leasesQuery;

    const leasesWithoutDoc = (leases || []).filter(l => !l.tenant?.document_number);
    if (leasesWithoutDoc.length > 0) {
      errors.push(`${leasesWithoutDoc.length} contrato(s) com inquilino sem CPF/CNPJ`);
    }

    return { errors, user };
  };

  const handleDimobPdf = async () => {
    try {
      const { errors, user } = await validateDimobData();
      setValidationErrors(errors);

      if (errors.length > 0) {
        toast({
          title: 'Atenção: Dados incompletos',
          description: 'Existem registros sem CPF/CNPJ. O relatório será gerado, mas pode estar incompleto.',
          variant: 'destructive',
        });
      }

      let leasesQuery = supabase
        .from('leases')
        .select(`
          *,
          unit:units(unit_number, address, city, state, postal_code, property:properties(name, address, city, state, postal_code)),
          tenant:contacts!leases_tenant_contact_id_fkey(name, document_number),
          owner:contacts!leases_owner_contact_id_fkey(name, document_number)
        `)
        .gte('start_date', dateRange.from.toISOString().split('T')[0])
        .or(`end_date.is.null,end_date.gte.${dateRange.from.toISOString().split('T')[0]}`);

      if (selectedUnitId) {
        leasesQuery = leasesQuery.eq('unit_id', selectedUnitId);
      }

      const { data: leases } = await leasesQuery;

      let paymentsQuery = supabase
        .from('financial_transactions')
        .select('*')
        .eq('type', 'income')
        .eq('obligation_type', 'rent')
        .eq('status', 'paid')
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);

      if (selectedUnitId) {
        paymentsQuery = paymentsQuery.eq('unit_id', selectedUnitId);
      }

      const { data: payments } = await paymentsQuery;

      const totalRent = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      await generateReportPdf({
        title: 'DIMOB - Prévia para Exportação',
        subtitle: 'Declaração de Informações sobre Atividades Imobiliárias',
        userName,
        dateRange,
        columns: ['Imóvel', 'Endereço', 'Inquilino', 'CPF/CNPJ', 'Aluguel Anual (R$)'],
        data: (leases || []).map(l => {
          const leasePayments = (payments || []).filter(p => p.unit_id === l.unit_id);
          const annualRent = leasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const unitAddress = l.unit?.address || l.unit?.property?.address || '';
          const unitCity = l.unit?.city || l.unit?.property?.city || '';
          const unitState = l.unit?.state || l.unit?.property?.state || '';
          return [
            l.unit?.unit_number || '-',
            `${unitAddress}, ${unitCity} - ${unitState}`,
            l.tenant?.name || '-',
            l.tenant?.document_number || 'NÃO INFORMADO',
            formatCurrency(annualRent),
          ];
        }),
        filename: 'dimob-previa',
        highlightCondition: (row) => row[3] === 'NÃO INFORMADO',
        summary: [
          { label: 'Ano-Calendário', value: dateRange.from.getFullYear().toString() },
          { label: 'Total de Contratos', value: (leases || []).length.toString() },
          { label: 'Total de Aluguéis Recebidos', value: formatCurrency(totalRent) },
          { label: 'Registros com Pendência', value: errors.length > 0 ? 'SIM' : 'NÃO' },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleDimobCsv = async () => {
    try {
      const { errors, user } = await validateDimobData();
      setValidationErrors(errors);

      if (errors.length > 0) {
        toast({
          title: 'Atenção: Dados incompletos',
          description: 'Existem registros sem CPF/CNPJ.',
          variant: 'destructive',
        });
      }

      let leasesQuery = supabase
        .from('leases')
        .select(`
          *,
          unit:units(unit_number, address, city, state, postal_code, property:properties(name, address, city, state, postal_code)),
          tenant:contacts!leases_tenant_contact_id_fkey(name, document_number, address, city, state, postal_code),
          owner:contacts!leases_owner_contact_id_fkey(name, document_number)
        `);

      if (selectedUnitId) {
        leasesQuery = leasesQuery.eq('unit_id', selectedUnitId);
      }

      const { data: leases } = await leasesQuery;

      let paymentsQuery = supabase
        .from('financial_transactions')
        .select('*')
        .eq('broker_id', user.id)
        .eq('type', 'income')
        .eq('obligation_type', 'rent')
        .eq('status', 'paid')
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);

      if (selectedUnitId) {
        paymentsQuery = paymentsQuery.eq('unit_id', selectedUnitId);
      }

      const { data: payments } = await paymentsQuery;

      generateReportCsv({
        columns: [
          'Identificador Imóvel',
          'Endereço Imóvel',
          'Cidade',
          'UF',
          'CEP',
          'Nome Inquilino',
          'CPF/CNPJ Inquilino',
          'Endereço Inquilino',
          'Nome Proprietário',
          'CPF/CNPJ Proprietário',
          'Valor Aluguel Mensal',
          'Total Recebido Período',
          'Data Início Contrato',
          'Data Fim Contrato',
        ],
        data: (leases || []).map(l => {
          const leasePayments = (payments || []).filter(p => p.unit_id === l.unit_id);
          const totalReceived = leasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          return [
            l.unit?.unit_number || '',
            l.unit?.address || l.unit?.property?.address || '',
            l.unit?.city || l.unit?.property?.city || '',
            l.unit?.state || l.unit?.property?.state || '',
            l.unit?.postal_code || l.unit?.property?.postal_code || '',
            l.tenant?.name || '',
            l.tenant?.document_number || '',
            l.tenant?.address || '',
            l.owner?.name || '',
            l.owner?.document_number || '',
            cleanNumericValue(l.rent_amount),
            cleanNumericValue(totalReceived),
            cleanDateValue(l.start_date),
            cleanDateValue(l.end_date),
          ];
        }),
        filename: 'dimob-exportacao',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pendências de Validação</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <ReportsTable
        title="Relatórios Fiscais"
        icon={<FileText className="h-5 w-5" />}
        description="Exportação prévia para DIMOB com validação de dados obrigatórios."
      >
        <ReportRow
          title="Exportação DIMOB"
          description="Prévia da declaração de atividades imobiliárias com validação de dados obrigatórios (CPF/CNPJ)."
          icon={<FileWarning className="h-4 w-4" />}
          onGeneratePDF={handleDimobPdf}
          onDownloadCSV={handleDimobCsv}
          warningMessage={validationErrors.length > 0 ? `${validationErrors.length} pendência(s)` : undefined}
        />
      </ReportsTable>
    </div>
  );
};
