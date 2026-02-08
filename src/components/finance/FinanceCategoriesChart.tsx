import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, LabelList } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyCompact, formatCurrencyFull } from "@/hooks/useSmartCurrency";

// Green palette for income categories (paid/received)
const INCOME_COLORS = [
  "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d",
  "#4ade80", "#86efac", "#bbf7d0", "#dcfce7", "#f0fdf4",
];

// Red palette for expense categories (paid)
const EXPENSE_COLORS = [
  "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d",
  "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2",
];

// Amber/Orange palette for pending status
const PENDING_COLORS = [
  "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f",
  "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7", "#fffbeb",
];

type StatusFilter = "all" | "paid" | "pending";

interface FinanceCategoriesChartProps {
  unitId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function FinanceCategoriesChart({ unitId, dateFrom, dateTo }: FinanceCategoriesChartProps) {
  const [type, setType] = useState<"income" | "expense">("income");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const isMobile = useIsMobile();
  const currentDate = new Date();
  const monthStart = dateFrom || format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = dateTo || format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { data: categoryData, isLoading } = useQuery({
    queryKey: ["finance-categories-chart", type, statusFilter, monthStart, monthEnd, unitId],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          amount,
          status,
          is_reconciled,
          category:financial_categories(id, name, color)
        `)
        .eq("type", type)
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd);

      if (unitId) {
        query = query.eq("unit_id", unitId);
      }

      const { data } = await query;

      if (!data) return [];

      // Filter based on status selection
      // Master rule: is_reconciled === true means effectively paid
      const filteredData = data.filter((t) => {
        const isEffectivelyPaid = t.status === "paid" || t.is_reconciled === true;
        
        if (statusFilter === "paid") return isEffectivelyPaid;
        if (statusFilter === "pending") return !isEffectivelyPaid;
        return true; // "all"
      });

      // Group by category
      const categoryMap = new Map<string, { name: string; value: number; color: string }>();

      filteredData.forEach((t) => {
        const categoryName = t.category?.name || "Sem categoria";
        const categoryColor = t.category?.color || "#6366f1";
        const existing = categoryMap.get(categoryName);

        if (existing) {
          existing.value += Number(t.amount);
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            value: Number(t.amount),
            color: categoryColor,
          });
        }
      });

      const sorted = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value);
      
      // Calculate percentages relative to filtered total
      const total = sorted.reduce((sum, item) => sum + item.value, 0);
      return sorted.map((item, index) => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0",
        // Use amber/orange palette for pending status, otherwise use type-based colors
        fill: statusFilter === "pending"
          ? (PENDING_COLORS[index % PENDING_COLORS.length])
          : type === "income" 
            ? (INCOME_COLORS[index % INCOME_COLORS.length])
            : (EXPENSE_COLORS[index % EXPENSE_COLORS.length]),
      }));
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const getStatusLabel = () => {
    if (statusFilter === "paid") return type === "income" ? "Recebidos" : "Pagos";
    if (statusFilter === "pending") return "Pendentes";
    return "Todos";
  };

  const renderPieLabel = ({ name, percent, cx, cy, midAngle, outerRadius, value }: any) => {
    // On mobile, show only in legend to avoid overlap
    if (isMobile) return null;
    
    // Skip labels for very small slices
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 35;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = (percent * 100).toFixed(0);
    
    // Truncate long names
    const displayName = name.length > 12 ? `${name.substring(0, 10)}...` : name;
    const formattedValue = formatCurrencyCompact(value);
    
    // New format: "R$ 5k (50%) Aluguel"
    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={500}
      >
        <tspan fontWeight={600}>{formattedValue}</tspan>
        <tspan fill="hsl(var(--muted-foreground))"> ({percentage}%) </tspan>
        <tspan>{displayName}</tspan>
      </text>
    );
  };

  const renderIncomeChart = () => (
    <div className="h-[320px] lg:h-[380px]">
      {categoryData && categoryData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy={isMobile ? "42%" : "45%"}
              innerRadius={isMobile ? 40 : 60}
              outerRadius={isMobile ? 70 : 100}
              paddingAngle={2}
              dataKey="value"
              label={renderPieLabel}
              labelLine={!isMobile && { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
            >
              {categoryData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill} 
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrencyFull(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend 
              layout={isMobile ? "vertical" : "horizontal"} 
              align="center" 
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: isMobile ? "8px" : "16px" }}
              formatter={(value, entry: any) => {
                const payload = entry.payload;
                if (isMobile) {
                  // Mobile: show full info in legend
                  return (
                    <span className="text-xs">
                      {value} • <span className="font-semibold">{formatCurrencyCompact(payload?.value || 0)}</span> ({payload?.percentage || 0}%)
                    </span>
                  );
                }
                return <span className="text-xs">{value}</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Nenhum dado de {getStatusLabel().toLowerCase()} disponível</p>
        </div>
      )}
    </div>
  );

  const renderExpenseChart = () => (
    <div className="h-[320px] lg:h-[380px] overflow-x-auto">
      {categoryData && categoryData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={categoryData.slice(0, 10)}
            layout="vertical"
            margin={{ top: 5, right: isMobile ? 50 : 80, left: isMobile ? 70 : 100, bottom: 30 }}
          >
            <XAxis 
              type="number" 
              hide 
              domain={[0, 'dataMax']}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={isMobile ? 65 : 95}
              tick={{ fontSize: isMobile ? 10 : 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => isMobile && value.length > 10 ? `${value.substring(0, 10)}...` : value}
            />
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                formatCurrencyFull(value), 
                `${props.payload.percentage}%`
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {categoryData.slice(0, 10).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value: number) => {
                  const item = categoryData?.find(d => d.value === value);
                  return `${formatCurrencyCompact(value)} (${item?.percentage || 0}%)`;
                }}
                style={{ fontSize: isMobile ? 9 : 11, fill: "hsl(var(--muted-foreground))" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Nenhum dado de {getStatusLabel().toLowerCase()} disponível</p>
        </div>
      )}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm lg:text-base">Análise por Categoria</CardTitle>
            <CardDescription className="text-[10px] lg:text-xs">
              Distribuição de {type === "income" ? "receitas" : "despesas"} • {getStatusLabel()}
            </CardDescription>
          </div>
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="paid" className="text-xs">
                {type === "income" ? "Recebidos" : "Pagos"}
              </SelectItem>
              <SelectItem value="pending" className="text-xs">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
        <Tabs value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="income" className="text-xs sm:text-sm">Receitas</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs sm:text-sm">Despesas</TabsTrigger>
          </TabsList>
          <TabsContent value="income">
            {renderIncomeChart()}
          </TabsContent>
          <TabsContent value="expense">
            {renderExpenseChart()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
