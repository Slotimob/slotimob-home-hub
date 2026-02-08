import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
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
