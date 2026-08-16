import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, LineChart as LineChartIcon, CalendarDays } from 'lucide-react';
import { format, subMonths, startOfMonth, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  computeInvestedAmount,
  computeAppreciation,
  computePeriodROI,
  computeMonthlyYield,
  computeCapRate,
  computeAnnualizedAppreciation,
} from '@/lib/asset-financials';
import {
  type AssetType,
  useAssetAcquisition,
  useMarketValueHistory,
  useAssetCashflowTransactions,
} from '@/hooks/useAssetFinancials';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const brlCompact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

const pct = (value: number) =>
  `${value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

const safeDate = (value?: string | null) => {
  if (!value) return null;
  try {
    const d = parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

function Metric({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/50">
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      <p
        className={`text-sm font-bold ${
          tone === 'positive'
            ? 'text-emerald-600'
            : tone === 'negative'
            ? 'text-red-600'
            : 'text-foreground'
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

interface AssetPerformanceBlockProps {
  assetType: AssetType;
  assetId: string;
  currentMarketValue?: number | null;
}

/**
 * Profitability / appreciation + 12-month cashflow for an asset.
 * Generic for units and properties: reuses the same acquisition and
 * market-value-history hooks already consumed by the other blocks.
 */
export function AssetPerformanceBlock({
  assetType,
  assetId,
  currentMarketValue,
}: AssetPerformanceBlockProps) {
  const { data: acquisition, isLoading: loadingAcq } = useAssetAcquisition(assetType, assetId);
  const { data: history = [], isLoading: loadingHistory } = useMarketValueHistory(
    assetType,
    assetId
  );

  const cutoff12m = useMemo(
    () => format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'),
    []
  );

  // Fetch from whichever is earlier: acquisition date or the 12-month window.
  const sinceDate = useMemo(() => {
    const acqDate = acquisition?.acquisition_date || null;
    if (!acqDate) return cutoff12m;
    return acqDate < cutoff12m ? acqDate : cutoff12m;
  }, [acquisition?.acquisition_date, cutoff12m]);

  const { data: transactions = [], isLoading: loadingTx } = useAssetCashflowTransactions(
    assetType,
    assetId,
    sinceDate
  );

  const totals = useMemo(() => {
    const acqDate = acquisition?.acquisition_date || null;
    let incomeSinceAcquisition = 0;
    let expensesSinceAcquisition = 0;
    let income12m = 0;
    let expenses12m = 0;

    transactions.forEach((tx) => {
      const amount = Number(tx.amount) || 0;
      const paid = tx.paid_date;
      const isIncome = tx.type === 'income';
      if (acqDate && paid && paid >= acqDate) {
        if (isIncome) incomeSinceAcquisition += amount;
        else expensesSinceAcquisition += amount;
      }
      if (paid && paid >= cutoff12m) {
        if (isIncome) income12m += amount;
        else expenses12m += amount;
      }
    });

    return { incomeSinceAcquisition, expensesSinceAcquisition, income12m, expenses12m };
  }, [transactions, acquisition?.acquisition_date, cutoff12m]);

  const monthlySeries = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { receita: number; despesa: number }> = {};
    for (let i = 11; i >= 0; i--) {
      buckets[format(subMonths(now, i), 'yyyy-MM')] = { receita: 0, despesa: 0 };
    }
    transactions.forEach((tx) => {
      if (!tx.paid_date) return;
      const key = tx.paid_date.substring(0, 7);
      if (!buckets[key]) return;
      if (tx.type === 'income') buckets[key].receita += Number(tx.amount) || 0;
      else buckets[key].despesa += Number(tx.amount) || 0;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => {
        const [year, m] = month.split('-');
        const date = new Date(parseInt(year), parseInt(m) - 1, 1);
        return {
          month,
          monthLabel: format(date, 'MMM/yy', { locale: ptBR }),
          receita: values.receita,
          despesa: values.despesa,
        };
      });
  }, [transactions]);

  const isLoading = loadingAcq || loadingHistory || loadingTx;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const acquisitionValue = acquisition?.acquisition_value ?? null;
  const acquisitionDate = safeDate(acquisition?.acquisition_date);
  const latestHistory = history.length ? history[history.length - 1] : null;
  const marketValue = latestHistory?.value ?? currentMarketValue ?? null;
  const marketValueDate = safeDate(latestHistory?.effective_date);

  // Nothing to show without acquisition data or market value
  if (acquisitionValue == null && marketValue == null) {
    return null;
  }

  const invested = computeInvestedAmount({
    acquisition_value: acquisitionValue,
    acquisition_costs: acquisition?.acquisition_costs,
    improvements_total: null,
  });

  const appreciation = computeAppreciation({
    market_value_current: marketValue,
    invested_amount: invested,
  });

  const daysElapsed = acquisitionDate ? differenceInDays(new Date(), acquisitionDate) : null;
  const yearsElapsed = daysElapsed != null && daysElapsed > 0 ? daysElapsed / 365.25 : null;

  const cagr = computeAnnualizedAppreciation({
    market_value_current: marketValue,
    acquisition_value: invested ?? acquisitionValue,
    years_elapsed: yearsElapsed,
  });

  const roi = computePeriodROI({
    income_period: totals.incomeSinceAcquisition,
    expenses_period: totals.expensesSinceAcquisition,
    invested_amount: invested,
  });

  const monthlyYield = computeMonthlyYield({
    rental_income_monthly: totals.income12m / 12,
    recurring_expenses_monthly: totals.expenses12m / 12,
    invested_amount: invested,
  });

  const capRate = computeCapRate({
    income_annual: totals.income12m,
    expenses_annual: totals.expenses12m,
    market_value_current: marketValue,
  });

  const elapsedLabel = (() => {
    if (daysElapsed == null || daysElapsed < 0) return '—';
    const years = Math.floor(daysElapsed / 365.25);
    const months = Math.floor((daysElapsed - years * 365.25) / 30.44);
    if (years <= 0 && months <= 0) return `${daysElapsed} dia(s)`;
    if (years <= 0) return `${months} mês(es)`;
    return months > 0 ? `${years} ano(s) e ${months} mês(es)` : `${years} ano(s)`;
  })();

  const sparkData = history.map((h) => ({
    date: h.effective_date,
    label: safeDate(h.effective_date)
      ? format(safeDate(h.effective_date)!, 'MMM/yy', { locale: ptBR })
      : '',
    value: Number(h.value) || 0,
  }));

  const cashflowTotals = monthlySeries.reduce(
    (acc, d) => ({ receita: acc.receita + d.receita, despesa: acc.despesa + d.despesa }),
    { receita: 0, despesa: 0 }
  );
  const cashflowBalance = cashflowTotals.receita - cashflowTotals.despesa;
  const hasCashflow = cashflowTotals.receita !== 0 || cashflowTotals.despesa !== 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            Rentabilidade e Valorização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Acquisition vs market value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-[11px] text-muted-foreground">Valor de aquisição</p>
              <p className="text-base font-bold">
                {acquisitionValue != null ? brl(acquisitionValue) : 'Não informado'}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <CalendarDays className="h-3 w-3" />
                {acquisitionDate
                  ? format(acquisitionDate, 'dd/MM/yyyy', { locale: ptBR })
                  : 'Data não informada'}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-[11px] text-muted-foreground">Valor de mercado atual</p>
              <p className="text-base font-bold">
                {marketValue != null ? brl(marketValue) : 'Não informado'}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <CalendarDays className="h-3 w-3" />
                {marketValueDate
                  ? `Atualizado em ${format(marketValueDate, 'dd/MM/yyyy', { locale: ptBR })}`
                  : 'Sem histórico de avaliação'}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <Metric
              label="Valorização no período"
              value={appreciation ? `${brl(appreciation.absolute)} (${pct(appreciation.pct)})` : '—'}
              tone={appreciation ? (appreciation.absolute >= 0 ? 'positive' : 'negative') : 'default'}
            />
            <Metric label="Tempo desde a aquisição" value={elapsedLabel} />
            <Metric
              label="Valorização anualizada (CAGR)"
              value={cagr != null ? pct(cagr) : '—'}
              tone={cagr != null ? (cagr >= 0 ? 'positive' : 'negative') : 'default'}
            />
            <Metric
              label="Renda acumulada no período"
              value={acquisitionDate ? brl(totals.incomeSinceAcquisition) : '—'}
              hint={acquisitionDate ? 'Recebimentos desde a aquisição' : undefined}
            />
            <Metric
              label="Retorno total sobre investido"
              value={roi ? pct(roi.roi_pct) : '—'}
              hint={roi ? `Líquido: ${brl(roi.net_period)}` : undefined}
              tone={roi ? (roi.roi_pct >= 0 ? 'positive' : 'negative') : 'default'}
            />
            <Metric
              label="Yield mensal atual"
              value={monthlyYield != null ? pct(monthlyYield) : '—'}
              hint="Base: média dos últimos 12 meses"
            />
            <Metric
              label="Cap rate"
              value={capRate != null ? pct(capRate) : '—'}
              hint="Receita líquida 12m / valor de mercado"
            />
          </div>

          {/* Sparkline */}
          {sparkData.length > 1 && (
            <div className="pt-1">
              <p className="text-[11px] text-muted-foreground mb-1">
                Evolução do valor de mercado
              </p>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [brl(value), 'Valor de mercado']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance Financeira (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasCashflow ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma transação financeira registrada para este ativo nos últimos 12 meses.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-green-500/10 text-center">
                  <p className="text-xs text-muted-foreground">Receita</p>
                  <p className="text-sm font-bold text-green-600">
                    {brlCompact(cashflowTotals.receita)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 text-center">
                  <p className="text-xs text-muted-foreground">Despesa</p>
                  <p className="text-sm font-bold text-red-600">
                    {brlCompact(cashflowTotals.despesa)}
                  </p>
                </div>
                <div
                  className={`p-2 rounded-lg text-center ${
                    cashflowBalance >= 0 ? 'bg-emerald-500/10' : 'bg-orange-500/10'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p
                    className={`text-sm font-bold ${
                      cashflowBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'
                    }`}
                  >
                    {brlCompact(cashflowBalance)}
                  </p>
                </div>
              </div>

              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySeries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="assetPerfReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="assetPerfDespesa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        brlCompact(value),
                        name === 'receita' ? 'Receita' : 'Despesa',
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={24}
                      formatter={(value) => (value === 'receita' ? 'Receita' : 'Despesa')}
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#assetPerfReceita)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="despesa"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#assetPerfDespesa)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AssetPerformanceBlock;
