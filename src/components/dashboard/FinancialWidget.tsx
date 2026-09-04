import { useEffect, useState } from 'react';
import { formatDateOnly, toDateOnly } from "@/lib/date-only";
import { format, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Wallet,
  Receipt,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DashboardDateFilter';
import { SmartCurrency, formatCurrencyFull } from '@/hooks/useSmartCurrency';
import { HelpTooltip } from '@/components/help/HelpTooltip';

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  receivables: Array<{
    id: string;
    description: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
  payables: Array<{
    id: string;
    description: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
}

interface FinancialWidgetProps {
  dateRange: DateRange;
  refreshKey?: number;
  isLoading?: boolean;
}

export function FinancialWidget({ dateRange, refreshKey, isLoading: externalLoading }: FinancialWidgetProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    receivables: [],
    payables: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, [dateRange, refreshKey]);

  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      
      const fromDate = toDateOnly(dateRange.from);
      const toDate = toDateOnly(dateRange.to);

      // Get paid transactions within the date range for totals
      // Using due_date for Cash Flow perspective (when money is expected to move)
      const { data: transactions, error: transError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('status', 'paid')
        .gte('due_date', fromDate)
        .lte('due_date', toDate);

      if (transError) throw transError;

      const totalRevenue = (transactions || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = (transactions || [])
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Get upcoming receivables (pending income)
      const { data: receivables } = await supabase
        .from('financial_transactions')
        .select('id, description, amount, due_date, status')
        .eq('type', 'income')
        .in('status', ['pending', 'overdue'])
        .gte('due_date', fromDate)
        .lte('due_date', toDate)
        .order('due_date', { ascending: true })
        .limit(10);

      // Get upcoming payables (pending expenses)
      const { data: payables } = await supabase
        .from('financial_transactions')
        .select('id, description, amount, due_date, status')
        .eq('type', 'expense')
        .in('status', ['pending', 'overdue'])
        .gte('due_date', fromDate)
        .lte('due_date', toDate)
        .order('due_date', { ascending: true })
        .limit(10);

      setData({
        totalRevenue,
        totalExpenses,
        receivables: receivables || [],
        payables: payables || [],
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loading = externalLoading || isLoading;

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(dueDate));
    const isOverdue = isBefore(due, today) && status !== 'paid';

    if (status === 'paid') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] px-1.5">Pago</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] px-1.5">Atrasado</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-[10px] px-1.5">Pendente</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 lg:px-6">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-1.5">
              Financeiro
              <HelpTooltip featureKey="dashboard.cash_flow_performance" />
            </CardTitle>
            <CardDescription className="text-[10px] lg:text-xs truncate">
              {format(dateRange.from, 'dd/MM', { locale: ptBR })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs px-2 flex-shrink-0" onClick={() => navigate('/finance')}>
            <span className="hidden sm:inline">Ver Todos</span>
            <ArrowRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 px-3 lg:px-6 pb-4 lg:pb-6">
          {/* Big Numbers - Full width row with 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Receitas */}
            <div className="rounded-lg border p-3 lg:p-4 bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">Receitas</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-500 cursor-help break-words">
                    <SmartCurrency value={data.totalRevenue} showTooltip={false} />
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono">{formatCurrencyFull(data.totalRevenue)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Despesas */}
            <div className="rounded-lg border p-3 lg:p-4 bg-red-500/5 border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-500" />
                </div>
                <span className="text-xs text-muted-foreground">Despesas</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-500 cursor-help break-words">
                    <SmartCurrency value={data.totalExpenses} showTooltip={false} />
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono">{formatCurrencyFull(data.totalExpenses)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Saldo */}
            <div className="rounded-lg border p-3 lg:p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Saldo</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className={`text-lg md:text-xl lg:text-2xl font-bold cursor-help break-words ${
                    (data.totalRevenue - data.totalExpenses) >= 0 
                      ? 'text-green-600 dark:text-green-500' 
                      : 'text-red-600 dark:text-red-500'
                  }`}>
                    <SmartCurrency value={data.totalRevenue - data.totalExpenses} showTooltip={false} />
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono">{formatCurrencyFull(data.totalRevenue - data.totalExpenses)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Receivables and Payables - Stack on small screens */}
          {/* Receivables and Payables - Taller for better readability */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {/* Contas a Receber */}
            <div className="rounded-lg border">
              <div className="px-2 lg:px-3 py-1.5 lg:py-2 border-b flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-[11px] lg:text-sm font-medium truncate">A Receber</span>
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                  {data.receivables.length}
                </Badge>
              </div>
              <ScrollArea className="h-[160px] lg:h-[200px]">
                {data.receivables.length === 0 ? (
                  <p className="text-[10px] lg:text-xs text-muted-foreground text-center py-4">
                    Nenhuma receita pendente
                  </p>
                ) : (
                  <div className="divide-y">
                    {data.receivables.map((item) => (
                      <div key={item.id} className="px-2 lg:px-3 py-1.5 lg:py-2 hover:bg-muted/50">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] lg:text-xs font-medium truncate flex-1">
                            {item.description}
                          </span>
                          {getStatusBadge(item.status, item.due_date)}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateOnly(item.due_date, 'dd/MM')}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] lg:text-xs font-medium text-green-600 cursor-help">
                                <SmartCurrency value={Number(item.amount)} forceCompact showTooltip={false} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono">{formatCurrencyFull(Number(item.amount))}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Contas a Pagar */}
            <div className="rounded-lg border">
              <div className="px-2 lg:px-3 py-1.5 lg:py-2 border-b flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                <span className="text-[11px] lg:text-sm font-medium truncate">A Pagar</span>
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                  {data.payables.length}
                </Badge>
              </div>
              <ScrollArea className="h-[160px] lg:h-[200px]">
                {data.payables.length === 0 ? (
                  <p className="text-[10px] lg:text-xs text-muted-foreground text-center py-4">
                    Nenhuma despesa pendente
                  </p>
                ) : (
                  <div className="divide-y">
                    {data.payables.map((item) => (
                      <div key={item.id} className="px-2 lg:px-3 py-1.5 lg:py-2 hover:bg-muted/50">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] lg:text-xs font-medium truncate flex-1">
                            {item.description}
                          </span>
                          {getStatusBadge(item.status, item.due_date)}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateOnly(item.due_date, 'dd/MM')}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] lg:text-xs font-medium text-red-600 cursor-help">
                                <SmartCurrency value={Number(item.amount)} forceCompact showTooltip={false} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono">{formatCurrencyFull(Number(item.amount))}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}