import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet, LineChart as LineChartIcon, CalendarDays } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns';
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

interface UnitFinancialPerformanceProps {
  unitId: string;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  receita: number;
  despesa: number;
}

export function UnitFinancialPerformance({ unitId }: UnitFinancialPerformanceProps) {
  return (
    <div className="space-y-4">
      <UnitProfitabilityCard unitId={unitId} />
      <UnitCashflowCard unitId={unitId} />
    </div>
  );
}

function UnitCashflowCard({ unitId }: UnitFinancialPerformanceProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['unit-financial-performance', unitId],
    queryFn: async () => {
      const now = new Date();
      const startDate = format(startOfMonth(subMonths(now, 11)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('amount, type, paid_date, status')
        .eq('unit_id', unitId)
        .eq('status', 'paid')
        .gte('paid_date', startDate)
        .lte('paid_date', endDate);

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { receita: number; despesa: number }> = {};

      // Initialize all 12 months
      for (let i = 11; i >= 0; i--) {
        const month = subMonths(now, i);
        const key = format(month, 'yyyy-MM');
        monthlyData[key] = { receita: 0, despesa: 0 };
      }

      // Aggregate transactions
      transactions?.forEach((tx) => {
        if (tx.paid_date) {
          const key = tx.paid_date.substring(0, 7); // YYYY-MM
          if (monthlyData[key]) {
            if (tx.type === 'income') {
              monthlyData[key].receita += tx.amount;
            } else {
              monthlyData[key].despesa += tx.amount;
            }
          }
        }
      });

      // Convert to array with labels
      const chartData: MonthlyData[] = Object.entries(monthlyData)
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

      // Calculate totals
      const totalReceita = chartData.reduce((sum, d) => sum + d.receita, 0);
      const totalDespesa = chartData.reduce((sum, d) => sum + d.despesa, 0);
      const balance = totalReceita - totalDespesa;

      return {
        chartData,
        totals: {
          receita: totalReceita,
          despesa: totalDespesa,
          balance,
        },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.chartData.every((d) => d.receita === 0 && d.despesa === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma transação financeira registrada para este imóvel nos últimos 12 meses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Performance Financeira (12 meses)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-sm font-bold text-green-600">
              {formatCurrency(data.totals.receita)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10 text-center">
            <p className="text-xs text-muted-foreground">Despesa</p>
            <p className="text-sm font-bold text-red-600">
              {formatCurrency(data.totals.despesa)}
            </p>
          </div>
          <div className={`p-2 rounded-lg text-center ${
            data.totals.balance >= 0 ? 'bg-emerald-500/10' : 'bg-orange-500/10'
          }`}>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-sm font-bold ${
              data.totals.balance >= 0 ? 'text-emerald-600' : 'text-orange-600'
            }`}>
              {formatCurrency(data.totals.balance)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
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
                  formatCurrency(value),
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
                fill="url(#colorReceita)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="despesa"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorDespesa)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}


// ---------------------------------------------------------------------------
// Profitability / appreciation block
// ---------------------------------------------------------------------------

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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

function UnitProfitabilityCard({ unitId }: UnitFinancialPerformanceProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['unit-profitability', unitId],
    queryFn: async () => {
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('acquisition_value, acquisition_costs, acquisition_date, market_value')
        .eq('id', unitId)
        .maybeSingle();
      if (unitError) throw unitError;

      const { data: history, error: histError } = await supabase
        .from('market_value_history')
        .select('value, effective_date')
        .eq('unit_id', unitId)
        .order('effective_date', { ascending: true });
      if (histError) throw histError;

      const acquisitionDate = unit?.acquisition_date || null;

      let incomeSinceAcquisition = 0;
      let expensesSinceAcquisition = 0;
      let income12m = 0;
      let expenses12m = 0;

      if (acquisitionDate) {
        const { data: txs, error: txError } = await supabase
          .from('financial_transactions')
          .select('amount, type, paid_date')
          .eq('unit_id', unitId)
          .eq('status', 'paid')
          .gte('paid_date', acquisitionDate);
        if (txError) throw txError;

        const cutoff12m = format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd');
        (txs || []).forEach((tx) => {
          const amount = Number(tx.amount) || 0;
          if (tx.type === 'income') {
            incomeSinceAcquisition += amount;
            if (tx.paid_date && tx.paid_date >= cutoff12m) income12m += amount;
          } else {
            expensesSinceAcquisition += amount;
            if (tx.paid_date && tx.paid_date >= cutoff12m) expenses12m += amount;
          }
        });
      }

      return {
        unit,
        history: history || [],
        incomeSinceAcquisition,
        expensesSinceAcquisition,
        income12m,
        expenses12m,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const unit = data?.unit;
  const acquisitionValue = unit?.acquisition_value ?? null;
  const acquisitionDate = safeDate(unit?.acquisition_date);
  const history = data?.history || [];
  const latestHistory = history.length ? history[history.length - 1] : null;
  const marketValue = latestHistory?.value ?? unit?.market_value ?? null;
  const marketValueDate = safeDate(latestHistory?.effective_date);

  // Nothing to show without acquisition data or market value
  if (acquisitionValue == null && marketValue == null) {
    return null;
  }

  const invested = computeInvestedAmount({
    acquisition_value: acquisitionValue,
    acquisition_costs: unit?.acquisition_costs,
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
    income_period: data?.incomeSinceAcquisition ?? null,
    expenses_period: data?.expensesSinceAcquisition ?? null,
    invested_amount: invested,
  });

  const monthlyYield = computeMonthlyYield({
    rental_income_monthly: data ? data.income12m / 12 : null,
    recurring_expenses_monthly: data ? data.expenses12m / 12 : null,
    invested_amount: invested,
  });

  const capRate = computeCapRate({
    income_annual: data?.income12m ?? null,
    expenses_annual: data?.expenses12m ?? null,
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
    label: safeDate(h.effective_date) ? format(safeDate(h.effective_date)!, 'MMM/yy', { locale: ptBR }) : '',
    value: Number(h.value) || 0,
  }));

  return (
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
              {acquisitionDate ? format(acquisitionDate, "dd/MM/yyyy", { locale: ptBR }) : 'Data não informada'}
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
            value={acquisitionDate ? brl(data?.incomeSinceAcquisition ?? 0) : '—'}
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
            <p className="text-[11px] text-muted-foreground mb-1">Evolução do valor de mercado</p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
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
  );
}
