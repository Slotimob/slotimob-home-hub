import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, CheckCircle2, AlertTriangle, Building2, FileSpreadsheet, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from "@/lib/date-only";

interface DimobRecord {
  unitId: string;
  unitName: string;
  cib: string | null;
  ownerName: string;
  ownerDocument: string | null;
  tenantName: string;
  tenantDocument: string | null;
  grossAnnualRent: number;
  annualCommission: number;
  taxWithheld: number;
  isComplete: boolean;
  missingFields: string[];
}

interface DimobSummary {
  totalUnits: number;
  completeUnits: number;
  incompleteUnits: number;
  totalGrossRent: number;
  totalCommission: number;
}

export const DimobReportTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  
  const [selectedYear, setSelectedYear] = useState(String(currentYear - 1));
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<DimobRecord[]>([]);
  const [summary, setSummary] = useState<DimobSummary>({
    totalUnits: 0,
    completeUnits: 0,
    incompleteUnits: 0,
    totalGrossRent: 0,
    totalCommission: 0
  });

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  useEffect(() => {
    if (user) {
      loadDimobData();
    }
  }, [user, selectedYear]);

  const loadDimobData = async () => {
    setIsLoading(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      // Fetch all leases that were active during the selected year
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          unit_id,
          tenant_contact_id,
          owner_contact_id,
          rent_amount,
          gross_rent_value,
          administration_fee_value,
          admin_fee_percentage,
          is_dimob_eligible,
          start_date,
          end_date,
          status
        `)
        .eq('is_dimob_eligible', true)
        .or(`end_date.is.null,end_date.gte.${startDate}`)
        .lte('start_date', endDate);

      if (leasesError) throw leasesError;

      const dimobRecords: DimobRecord[] = [];

      for (const lease of leases || []) {
        // Fetch unit data
        const { data: unit } = await supabase
          .from('units')
          .select('id, unit_number, cib, address, property_id')
          .eq('id', lease.unit_id)
          .single();

        // Fetch owner contact
        let ownerName = 'Não informado';
        let ownerDocument: string | null = null;
        if (lease.owner_contact_id) {
          const { data: owner } = await supabase
            .from('contacts')
            .select('name, document_number')
            .eq('id', lease.owner_contact_id)
            .single();
          if (owner) {
            ownerName = owner.name;
            ownerDocument = owner.document_number;
          }
        }

        // Fetch tenant contact
        let tenantName = 'Não informado';
        let tenantDocument: string | null = null;
        if (lease.tenant_contact_id) {
          const { data: tenant } = await supabase
            .from('contacts')
            .select('name, document_number')
            .eq('id', lease.tenant_contact_id)
            .single();
          if (tenant) {
            tenantName = tenant.name;
            tenantDocument = tenant.document_number;
          }
        }

        // Calculate months active in the selected year
        const leaseStart = parseDateOnly(lease.start_date) ?? parseDateOnly(startDate)!;
        const leaseEnd = (lease.end_date ? parseDateOnly(lease.end_date) : null) ?? parseDateOnly(endDate)!;
        const yearStart = parseDateOnly(startDate)!;
        const yearEnd = parseDateOnly(endDate)!;
        
        const activeStart = leaseStart > yearStart ? leaseStart : yearStart;
        const activeEnd = leaseEnd < yearEnd ? leaseEnd : yearEnd;
        const monthsActive = Math.max(0, 
          (activeEnd.getFullYear() - activeStart.getFullYear()) * 12 + 
          (activeEnd.getMonth() - activeStart.getMonth()) + 1
        );

        const monthlyRent = lease.gross_rent_value || lease.rent_amount || 0;
        const grossAnnualRent = monthlyRent * monthsActive;
        
        const adminFee = lease.administration_fee_value || 
          (monthlyRent * (lease.admin_fee_percentage || 10) / 100);
        const annualCommission = adminFee * monthsActive;
        
        // Tax withheld calculation (simplified - 15% on gross)
        const taxWithheld = grossAnnualRent * 0.15;

        // Check for missing fields
        const missingFields: string[] = [];
        if (!unit?.cib) missingFields.push('CIB');
        if (!ownerDocument) missingFields.push('CPF/CNPJ Proprietário');
        if (!tenantDocument) missingFields.push('CPF/CNPJ Inquilino');

        dimobRecords.push({
          unitId: lease.unit_id,
          unitName: unit?.unit_number || `Unidade ${lease.unit_id.slice(0, 8)}`,
          cib: unit?.cib || null,
          ownerName,
          ownerDocument,
          tenantName,
          tenantDocument,
          grossAnnualRent,
          annualCommission,
          taxWithheld,
          isComplete: missingFields.length === 0,
          missingFields
        });
      }

      setRecords(dimobRecords);
      
      // Calculate summary
      const completeUnits = dimobRecords.filter(r => r.isComplete).length;
      setSummary({
        totalUnits: dimobRecords.length,
        completeUnits,
        incompleteUnits: dimobRecords.length - completeUnits,
        totalGrossRent: dimobRecords.reduce((sum, r) => sum + r.grossAnnualRent, 0),
        totalCommission: dimobRecords.reduce((sum, r) => sum + r.annualCommission, 0)
      });

    } catch (error: any) {
      console.error('Error loading DIMOB data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Não há registros DIMOB para o ano selecionado.',
        variant: 'destructive'
      });
      return;
    }

    const headers = [
      'Unidade',
      'CIB',
      'Nome Locador',
      'CPF/CNPJ Locador',
      'Nome Locatário',
      'CPF/CNPJ Locatário',
      'Valor Bruto Anual',
      'Comissão Anual',
      'Imposto Retido',
      'Status'
    ];

    const csvData = records.map(r => [
      r.unitName,
      r.cib || '',
      r.ownerName,
      r.ownerDocument || '',
      r.tenantName,
      r.tenantDocument || '',
      r.grossAnnualRent.toFixed(2),
      r.annualCommission.toFixed(2),
      r.taxWithheld.toFixed(2),
      r.isComplete ? 'Completo' : `Pendente: ${r.missingFields.join(', ')}`
    ]);

    const csvContent = [
      [`PRÉVIA DIMOB - ANO BASE ${selectedYear}`],
      [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`],
      [],
      headers,
      ...csvData,
      [],
      ['RESUMO'],
      [`Total de Imóveis: ${summary.totalUnits}`],
      [`Imóveis Completos: ${summary.completeUnits}`],
      [`Imóveis com Pendências: ${summary.incompleteUnits}`],
      [`Valor Bruto Total: R$ ${summary.totalGrossRent.toFixed(2)}`],
      [`Comissões Total: R$ ${summary.totalCommission.toFixed(2)}`]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `previa-dimob-${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV exportado!',
      description: `Prévia DIMOB ${selectedYear} baixada com sucesso.`
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Relatório DIMOB</h3>
          <p className="text-sm text-muted-foreground">
            Prévia dos dados para declaração à Receita Federal
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ano Base" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year}>Ano Base {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total de Imóveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUnits}</div>
            <p className="text-xs text-muted-foreground">
              com contratos no período
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Aptos para DIMOB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{summary.completeUnits}</div>
            <p className="text-xs text-muted-foreground">
              dados completos
            </p>
          </CardContent>
        </Card>

        <Card className={summary.incompleteUnits > 0 ? 'border-amber-200 bg-amber-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Com Pendências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{summary.incompleteUnits}</div>
            <p className="text-xs text-muted-foreground">
              dados incompletos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Valor Bruto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalGrossRent)}</div>
            <p className="text-xs text-muted-foreground">
              Comissões: {formatCurrency(summary.totalCommission)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          O DIMOB (Declaração de Informações sobre Atividades Imobiliárias) é obrigatório para imobiliárias 
          e deve ser entregue anualmente à Receita Federal. Esta prévia ajuda a verificar os dados antes 
          da geração do arquivo oficial.
        </AlertDescription>
      </Alert>

      {/* Data Table */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando dados DIMOB...</p>
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">Nenhum registro encontrado</h4>
            <p className="text-sm text-muted-foreground max-w-md">
              Não foram encontrados contratos de locação elegíveis para DIMOB no ano base {selectedYear}.
              Verifique se os contratos possuem a flag "Elegível DIMOB" ativada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prévia de Dados</CardTitle>
            <CardDescription>
              Dados que serão incluídos na declaração DIMOB {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidade</TableHead>
                    <TableHead>CIB</TableHead>
                    <TableHead>Locador</TableHead>
                    <TableHead>Locatário</TableHead>
                    <TableHead className="text-right">Valor Bruto</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.unitId}>
                      <TableCell className="font-medium">{record.unitName}</TableCell>
                      <TableCell>
                        {record.cib || (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{record.ownerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.ownerDocument || 'CPF não informado'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{record.tenantName}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.tenantDocument || 'CPF não informado'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.grossAnnualRent)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.annualCommission)}
                      </TableCell>
                      <TableCell>
                        {record.isComplete ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            Completo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DimobReportTab;
