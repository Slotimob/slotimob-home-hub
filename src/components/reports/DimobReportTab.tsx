import { Fragment, useEffect, useState } from 'react';
import { isValidCpfCnpj } from "@/lib/document-validation";
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
import { buildDimobMonths, sumMonths, type DimobMonth } from "@/lib/dimob";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface DimobRecord {
  /** Chave única da linha (contrato + imóvel). */
  rowKey: string;
  unitId: string;
  unitName: string;
  unitAddress: string | null;
  /** Contrato com vários imóveis: "X% do contrato (N imóveis)". */
  shareLabel?: string | null;
  cib: string | null;
  ownerName: string;
  ownerDocument: string | null;
  tenantName: string;
  tenantDocument: string | null;
  grossAnnualRent: number;
  annualCommission: number;
  taxWithheld: number;
  /** Abatimentos pagos no ano (informativo; não reduzem o bruto). */
  deductions: number;
  /** Valores por mês de pagamento (Jan–Dez). */
  months: DimobMonth[];
  commissionEstimated: boolean;
  /** Sem lançamentos de aluguel pagos no ano: bruto calculado pelo contrato. */
  /** Sem pagamento no ano: valor declarado 0; `forecastRent` é só referência. */
  isEstimated: boolean;
  /** Previsto pelo contrato (não declarar, não entra em totais/CSV). */
  forecastRent: number;
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<DimobSummary>({
    totalUnits: 0,
    completeUnits: 0,
    incompleteUnits: 0,
    totalGrossRent: 0,
    totalCommission: 0
  });

  const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

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

      // Lançamentos reais PAGOS no ano-calendário (aluguel, IRRF, abatimentos)
      const leaseIds = (leases || []).map((l) => l.id);
      const paidTx: any[] = [];
      for (let i = 0; i < leaseIds.length; i += 100) {
        const chunk = leaseIds.slice(i, i + 100);
        const refs = chunk.map((id) => `lease:${id}`);
        const { data: txs, error: txError } = await supabase
          .from('financial_transactions')
          .select('lease_id, reference, type, amount, obligation_type, metadata, paid_date, competency_period, category:financial_categories(name)')
          .or(`lease_id.in.(${chunk.join(',')}),reference.in.(${refs.map((r) => `"${r}"`).join(',')})`)
          .eq('status', 'paid')
          .gte('paid_date', startDate)
          .lte('paid_date', endDate);
        if (txError) throw txError;
        paidTx.push(...(txs || []));
      }
      const txByLease = new Map<string, any[]>();
      paidTx.forEach((t) => {
        const id = t.lease_id || (t.reference?.startsWith('lease:') ? t.reference.slice(6) : null);
        if (!id) return;
        if (!txByLease.has(id)) txByLease.set(id, []);
        txByLease.get(id)!.push(t);
      });

      // Contratos com vários imóveis: uma linha DIMOB por imóvel, com valor rateado
      const luByLease = new Map<string, { unit_id: string; is_primary: boolean; share_percent: number | null }[]>();
      for (let i = 0; i < leaseIds.length; i += 100) {
        const { data: lus } = await supabase
          .from('lease_units')
          .select('lease_id, unit_id, is_primary, share_percent')
          .in('lease_id', leaseIds.slice(i, i + 100));
        (lus || []).forEach((r: any) => {
          if (!luByLease.has(r.lease_id)) luByLease.set(r.lease_id, []);
          luByLease.get(r.lease_id)!.push(r);
        });
      }

      const dimobRecords: DimobRecord[] = [];

      for (const lease of leases || []) {
        const lus = luByLease.get(lease.id) || [];
        const isMulti = lus.length > 1;
        // Frações do mesmo imóvel viram uma linha só (fatores somados por unit_id)
        const shares = isMulti
          ? Array.from(
              [...lus]
                .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
                .reduce((acc, lu) => {
                  const f = lu.share_percent != null ? Number(lu.share_percent) / 100 : 1 / lus.length;
                  acc.set(lu.unit_id, (acc.get(lu.unit_id) || 0) + f);
                  return acc;
                }, new Map<string, number>())
            ).map(([unit_id, factor]) => ({ unit_id, factor }))
          : [{ unit_id: lease.unit_id, factor: 1 }];
        const unitIdsForLease = shares.map((x) => x.unit_id);
        const { data: unitRows } = await supabase
          .from('units')
          .select('id, unit_number, cib, address, property_id')
          .in('id', unitIdsForLease);
        const unitById = new Map((unitRows || []).map((u) => [u.id, u]));

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
        const leaseTx = txByLease.get(lease.id) || [];
        const built = buildDimobMonths(leaseTx, {
          adminFeePercentage: lease.admin_fee_percentage,
          administrationFeeValue: lease.administration_fee_value,
        });
        const isEstimated = !built.hasRent;
        // DM4: DIMOB é por caixa — sem pagamento no ano, declara 0; a previsão fica à parte.
        const months = built.months;
        const commissionEstimated = built.commissionEstimated;
        let forecastTotal = 0;
        if (isEstimated) {
          months.forEach((_, i) => {
            const active = monthsActive > 0 && i >= activeStart.getMonth() && i <= activeEnd.getMonth()
              && activeStart.getFullYear() === Number(selectedYear);
            if (active) forecastTotal += monthlyRent;
          });
        }
        const deductions = built.deductions;

        // Rateio: arredonda por imóvel e ajusta a diferença no último, para a soma bater
        const split = (total: number) => {
          let acc = 0;
          return shares.map((x, idx) => {
            if (idx === shares.length - 1) return Math.round((total - acc) * 100) / 100;
            const v = Math.round(total * x.factor * 100) / 100;
            acc += v;
            return v;
          });
        };
        const monthParts: DimobMonth[][] = shares.map(() => []);
        months.forEach((m) => {
          const rp = split(m.rent), cp = split(m.commission), tp = split(m.tax);
          shares.forEach((_, idx) => monthParts[idx].push({ rent: rp[idx], commission: cp[idx], tax: tp[idx] }));
        });
        const dedParts = split(deductions);
        const forecastParts = split(Math.round(forecastTotal * 100) / 100);

        shares.forEach((x, idx) => {
          const unit = unitById.get(x.unit_id);
          const missingFields: string[] = [];
          if (!unit?.cib) missingFields.push('CIB');
          if (!ownerDocument) missingFields.push('CPF/CNPJ Proprietário');
          else if (!isValidCpfCnpj(ownerDocument)) missingFields.push('CPF/CNPJ inválido (Proprietário)');
          if (!tenantDocument) missingFields.push('CPF/CNPJ Inquilino');
          else if (!isValidCpfCnpj(tenantDocument)) missingFields.push('CPF/CNPJ inválido (Inquilino)');

          dimobRecords.push({
            rowKey: `${lease.id}:${x.unit_id}`,
            unitId: x.unit_id,
            unitName: unit?.unit_number || `Unidade ${x.unit_id.slice(0, 8)}`,
            unitAddress: unit?.address || null,
            shareLabel: isMulti
              ? `${(Math.round(x.factor * 10000) / 100).toLocaleString('pt-BR')}% do contrato (${shares.length} imóveis)`
              : null,
            cib: unit?.cib || null,
            ownerName,
            ownerDocument,
            tenantName,
            tenantDocument,
            grossAnnualRent: sumMonths(monthParts[idx], 'rent'),
            annualCommission: sumMonths(monthParts[idx], 'commission'),
            taxWithheld: sumMonths(monthParts[idx], 'tax'),
            months: monthParts[idx],
            commissionEstimated,
            deductions: dedParts[idx],
            isEstimated,
            forecastRent: isEstimated ? forecastParts[idx] : 0,
            isComplete: missingFields.length === 0,
            missingFields
          });
        });
      }

      setRecords(dimobRecords);
      
      // Calculate summary
      // "Aptos" = dados completos e com pagamento no ano
      const completeUnits = dimobRecords.filter(r => r.isComplete && !r.isEstimated).length;
      setSummary({
        totalUnits: dimobRecords.length,
        completeUnits,
        incompleteUnits: dimobRecords.filter(r => !r.isComplete).length,
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
      'Status',
      ...MONTH_LABELS.map((m) => `Aluguel ${m}`),
      ...MONTH_LABELS.map((m) => `Comissão ${m}`),
      ...MONTH_LABELS.map((m) => `Imposto ${m}`),
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
      !r.isComplete
        ? `Pendente: ${r.missingFields.join(', ')}`
        : r.isEstimated ? 'Sem pagamento no ano' : 'Completo',
      ...r.months.map((m) => m.rent.toFixed(2)),
      ...r.months.map((m) => m.commission.toFixed(2)),
      ...r.months.map((m) => m.tax.toFixed(2)),
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
            Prévia para conferência e preenchimento no programa da DIMOB (PGD) da Receita Federal. Valores pelo mês do pagamento (regime de caixa).
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

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          A Dimob usa o mês em que o inquilino pagou (regime de caixa) e o valor bruto do aluguel. Multa e juros
          repassados entram no aluguel; o IRRF vai no campo de imposto retido. Pessoa física não entrega Dimob: use
          estes valores como base para carnê-leão e DIRPF.
        </AlertDescription>
      </Alert>

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
              <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
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
                    <TableHead className="text-right">Previsto (não declarar)</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <Fragment key={record.rowKey}>
                    <TableRow>
                      <TableCell className="font-medium">
                        {record.unitName}
                        {record.unitAddress && (
                          <p className="text-xs font-normal text-muted-foreground">{record.unitAddress}</p>
                        )}
                        {record.shareLabel && (
                          <p className="text-[11px] font-normal text-primary">{record.shareLabel}</p>
                        )}
                      </TableCell>
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
                      <TableCell
                        className="text-right"
                        title={`IRRF retido: ${formatCurrency(record.taxWithheld)} • Abatimentos (informativo, não reduzem o bruto): ${formatCurrency(record.deductions)}`}
                      >
                        {formatCurrency(record.grossAnnualRent)}
                        {record.isEstimated && (
                          <div><Badge variant="outline" className="text-[10px] mt-1">sem pagamento no ano</Badge></div>
                        )}
                        {!record.isEstimated && (record.taxWithheld > 0 || record.deductions > 0) && (
                          <p className="text-[10px] text-muted-foreground">
                            {record.taxWithheld > 0 ? `IRRF ${formatCurrency(record.taxWithheld)}` : ''}
                            {record.taxWithheld > 0 && record.deductions > 0 ? ' · ' : ''}
                            {record.deductions > 0 ? `abat. ${formatCurrency(record.deductions)}` : ''}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {record.isEstimated && record.forecastRent > 0 ? formatCurrency(record.forecastRent) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.annualCommission)}
                        {record.commissionEstimated && (
                          <div><Badge variant="outline" className="text-[10px] mt-1">comissão estimada</Badge></div>
                        )}
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
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 mt-1 text-xs block"
                          aria-expanded={expanded.has(record.rowKey)}
                          onClick={() =>
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(record.rowKey)) next.delete(record.rowKey);
                              else next.add(record.rowKey);
                              return next;
                            })
                          }
                        >
                          Mês a mês
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded.has(record.rowKey) && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-2">
                          <div className="max-w-full overflow-x-auto">
                            <table className="w-full text-[11px] tabular-nums">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="p-1 text-left font-medium" />
                                  {MONTH_LABELS.map((m) => (
                                    <th key={m} className="p-1 text-right font-medium">{m}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {([
                                  ['Aluguel', 'rent'],
                                  ['Comissão', 'commission'],
                                  ['Imposto retido', 'tax'],
                                ] as const).map(([label, k]) => (
                                  <tr key={k} className="border-t border-border">
                                    <td className="p-1 font-medium whitespace-nowrap">{label}</td>
                                    {record.months.map((m, i) => (
                                      <td key={i} className="p-1 text-right whitespace-nowrap">
                                        {m[k] ? formatCurrency(m[k]) : '–'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
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
