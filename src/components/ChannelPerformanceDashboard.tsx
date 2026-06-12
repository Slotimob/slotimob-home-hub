import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Users, Target, Wallet, Percent, Facebook, Search, Instagram, MessageCircle, Globe, User, CalendarIcon, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const sourceIcons: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  google: <Search className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  indicacao: <User className="h-4 w-4" />,
};

const sourceColors: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  google: '#EA4335',
  whatsapp: '#25D366',
  website: 'hsl(var(--primary))',
  indicacao: 'hsl(var(--chart-4))',
  manual: 'hsl(var(--muted-foreground))',
  outro: 'hsl(var(--chart-5))',
};

interface ChannelMetrics {
  source: string;
  leads: number;
  converted: number;
  conversionRate: number;
  totalValue: number;
  avgValue: number;
  acquisitionCost: number;
  roi: number | null;
}

interface CampaignMetrics {
  campaign: string;
  source: string;
  leads: number;
  converted: number;
  conversionRate: number;
  totalValue: number;
  acquisitionCost: number;
  roi: number | null;
}

interface LeadTrend {
  month: string;
  facebook: number;
  instagram: number;
  google: number;
  whatsapp: number;
  website: number;
  outros: number;
}

interface ChannelCost {
  source: string;
  cost: number;
}

export const ChannelPerformanceDashboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('6');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([]);
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics[]>([]);
  const [leadTrends, setLeadTrends] = useState<LeadTrend[]>([]);
  const [channelCosts, setChannelCosts] = useState<ChannelCost[]>([]);
  const [showCostEditor, setShowCostEditor] = useState(false);
  const [totals, setTotals] = useState({
    totalLeads: 0,
    totalConverted: 0,
    totalValue: 0,
    avgConversionRate: 0,
    totalCost: 0,
    totalROI: null as number | null,
  });

  // Load saved costs from localStorage
  useEffect(() => {
    const savedCosts = localStorage.getItem('channel_costs');
    if (savedCosts) {
      setChannelCosts(JSON.parse(savedCosts));
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadMetrics();
    }
  }, [user, period, dateRange, isCustomPeriod, channelCosts]);

  const getDateRange = () => {
    if (isCustomPeriod && dateRange.from && dateRange.to) {
      return {
        startDate: startOfDay(dateRange.from),
        endDate: endOfDay(dateRange.to),
      };
    }
    const months = parseInt(period);
    return {
      startDate: startOfMonth(subMonths(new Date(), months - 1)),
      endDate: endOfDay(new Date()),
    };
  };

  const handlePeriodChange = (value: string) => {
    setIsCustomPeriod(false);
    setDateRange({ from: undefined, to: undefined });
    setPeriod(value);
  };

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    if (range.from && range.to) {
      setIsCustomPeriod(true);
    }
  };

  const clearCustomPeriod = () => {
    setIsCustomPeriod(false);
    setDateRange({ from: undefined, to: undefined });
  };

  const getCostForSource = (source: string): number => {
    const cost = channelCosts.find(c => c.source.toLowerCase() === source.toLowerCase());
    return cost?.cost || 0;
  };

  const updateChannelCost = (source: string, cost: number) => {
    const existingIndex = channelCosts.findIndex(c => c.source.toLowerCase() === source.toLowerCase());
    let newCosts: ChannelCost[];
    
    if (existingIndex >= 0) {
      newCosts = [...channelCosts];
      newCosts[existingIndex] = { source, cost };
    } else {
      newCosts = [...channelCosts, { source, cost }];
    }
    
    setChannelCosts(newCosts);
    localStorage.setItem('channel_costs', JSON.stringify(newCosts));
  };

  const calculateROI = (revenue: number, cost: number): number | null => {
    if (cost <= 0) return null;
    return ((revenue - cost) / cost) * 100;
  };

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getDateRange();

      // Fetch leads with UTM data
      const { data: leads } = await supabase
        .from('leads')
        .select('id, utm_source, utm_medium, utm_campaign, origin, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch won deals with values
      const { data: deals } = await supabase
        .from('deals')
        .select('lead_id, stage, estimated_value, created_at')
        .eq('stage', 'won')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Create a map of converted leads
      const convertedLeadIds = new Set((deals || []).map(d => d.lead_id));
      const leadValues: Record<string, number> = {};
      (deals || []).forEach(d => {
        leadValues[d.lead_id] = d.estimated_value || 0;
      });

      // Process channel metrics
      const channelMap: Record<string, { leads: number; converted: number; totalValue: number }> = {};
      const campaignMap: Record<string, { source: string; leads: number; converted: number; totalValue: number }> = {};
      const monthlyTrends: Record<string, Record<string, number>> = {};

      (leads || []).forEach(lead => {
        const source = lead.utm_source || lead.origin || 'Não informado';
        const normalizedSource = source.toLowerCase();
        const campaign = lead.utm_campaign || 'Sem campanha';
        const month = format(new Date(lead.created_at), 'MMM/yy', { locale: ptBR });
        const isConverted = convertedLeadIds.has(lead.id);
        const value = leadValues[lead.id] || 0;

        // Channel metrics
        if (!channelMap[normalizedSource]) {
          channelMap[normalizedSource] = { leads: 0, converted: 0, totalValue: 0 };
        }
        channelMap[normalizedSource].leads++;
        if (isConverted) {
          channelMap[normalizedSource].converted++;
          channelMap[normalizedSource].totalValue += value;
        }

        // Campaign metrics
        const campaignKey = `${campaign}|${normalizedSource}`;
        if (!campaignMap[campaignKey]) {
          campaignMap[campaignKey] = { source: normalizedSource, leads: 0, converted: 0, totalValue: 0 };
        }
        campaignMap[campaignKey].leads++;
        if (isConverted) {
          campaignMap[campaignKey].converted++;
          campaignMap[campaignKey].totalValue += value;
        }

        // Monthly trends
        if (!monthlyTrends[month]) {
          monthlyTrends[month] = { facebook: 0, instagram: 0, google: 0, whatsapp: 0, website: 0, outros: 0 };
        }
        const trendKey = ['facebook', 'instagram', 'google', 'whatsapp', 'website'].includes(normalizedSource)
          ? normalizedSource
          : 'outros';
        monthlyTrends[month][trendKey]++;
      });

      // Format channel metrics with ROI
      const formattedChannelMetrics: ChannelMetrics[] = Object.entries(channelMap)
        .map(([source, data]) => {
          const cost = getCostForSource(source);
          return {
            source,
            leads: data.leads,
            converted: data.converted,
            conversionRate: data.leads > 0 ? (data.converted / data.leads) * 100 : 0,
            totalValue: data.totalValue,
            avgValue: data.converted > 0 ? data.totalValue / data.converted : 0,
            acquisitionCost: cost,
            roi: calculateROI(data.totalValue, cost),
          };
        })
        .sort((a, b) => b.leads - a.leads);

      // Format campaign metrics with ROI
      const formattedCampaignMetrics: CampaignMetrics[] = Object.entries(campaignMap)
        .map(([key, data]) => {
          const [campaign] = key.split('|');
          const cost = getCostForSource(data.source);
          // Proportionally distribute cost based on leads
          const totalSourceLeads = channelMap[data.source]?.leads || 1;
          const proportionalCost = (data.leads / totalSourceLeads) * cost;
          return {
            campaign,
            source: data.source,
            leads: data.leads,
            converted: data.converted,
            conversionRate: data.leads > 0 ? (data.converted / data.leads) * 100 : 0,
            totalValue: data.totalValue,
            acquisitionCost: proportionalCost,
            roi: calculateROI(data.totalValue, proportionalCost),
          };
        })
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 10);

      // Format lead trends
      const formattedTrends: LeadTrend[] = Object.entries(monthlyTrends)
        .map(([month, data]) => ({
          month,
          facebook: data.facebook || 0,
          instagram: data.instagram || 0,
          google: data.google || 0,
          whatsapp: data.whatsapp || 0,
          website: data.website || 0,
          outros: data.outros || 0,
        }))
        .sort((a, b) => {
          const [aMonth, aYear] = a.month.split('/');
          const [bMonth, bYear] = b.month.split('/');
          return (aYear + aMonth).localeCompare(bYear + bMonth);
        });

      // Calculate totals
      const totalLeads = formattedChannelMetrics.reduce((sum, c) => sum + c.leads, 0);
      const totalConverted = formattedChannelMetrics.reduce((sum, c) => sum + c.converted, 0);
      const totalValue = formattedChannelMetrics.reduce((sum, c) => sum + c.totalValue, 0);
      const totalCost = formattedChannelMetrics.reduce((sum, c) => sum + c.acquisitionCost, 0);

      setChannelMetrics(formattedChannelMetrics);
      setCampaignMetrics(formattedCampaignMetrics);
      setLeadTrends(formattedTrends);
      setTotals({
        totalLeads,
        totalConverted,
        totalValue,
        avgConversionRate: totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0,
        totalCost,
        totalROI: calculateROI(totalValue, totalCost),
      });
    } catch (error) {
      console.error('Error loading channel metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    return sourceIcons[source.toLowerCase()] || <Globe className="h-4 w-4" />;
  };

  const getSourceColor = (source: string) => {
    return sourceColors[source.toLowerCase()] || 'hsl(var(--muted-foreground))';
  };

  const formatSourceName = (source: string) => {
    const names: Record<string, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      google: 'Google Ads',
      whatsapp: 'WhatsApp',
      website: 'Website',
      indicacao: 'Indicação',
      manual: 'Manual',
      outro: 'Outro',
      'não informado': 'Não Informado',
    };
    return names[source.toLowerCase()] || source;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Performance por Canal</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Periods */}
          <Select 
            value={isCustomPeriod ? '' : period} 
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={isCustomPeriod ? 'default' : 'outline'}
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Período personalizado</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => handleDateRangeSelect({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {isCustomPeriod && (
            <Button variant="ghost" size="sm" onClick={clearCustomPeriod}>
              Limpar
            </Button>
          )}

          {/* Cost Editor Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCostEditor(!showCostEditor)}
          >
            <Wallet className="h-4 w-4 mr-1" />
            Custos
          </Button>
        </div>
      </div>

      {/* Cost Editor */}
      {showCostEditor && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custos de Aquisição por Canal</CardTitle>
            <CardDescription>
              Informe o custo total investido em cada canal no período para calcular o ROI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {['facebook', 'instagram', 'google', 'whatsapp', 'website', 'indicacao'].map((source) => (
                <div key={source} className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <span style={{ color: getSourceColor(source) }}>
                      {getSourceIcon(source)}
                    </span>
                    {formatSourceName(source)}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="number"
                      placeholder="0,00"
                      className="pl-10"
                      value={getCostForSource(source) || ''}
                      onChange={(e) => updateChannelCost(source, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalLeads.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">
              de {channelMetrics.length} canais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Convertidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalConverted.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">
              negócios fechados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.avgConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              média geral
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(totals.totalValue / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground">
              em negócios ganhos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Investimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totals.totalCost > 0 ? (totals.totalCost / 1000).toFixed(1) + 'k' : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              custo de aquisição
            </p>
          </CardContent>
        </Card>

        <Card className={totals.totalROI !== null ? (totals.totalROI >= 0 ? 'border-green-500/50' : 'border-red-500/50') : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ROI Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              totals.totalROI !== null && totals.totalROI >= 0 ? "text-green-600" : totals.totalROI !== null ? "text-red-600" : ""
            )}>
              {totals.totalROI !== null ? `${totals.totalROI.toFixed(0)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.totalROI === null ? 'configure custos' : 'retorno sobre investimento'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Por Canal</TabsTrigger>
          <TabsTrigger value="campaigns">Por Campanha</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Leads by Source Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Leads por Origem</CardTitle>
                <CardDescription>Distribuição de leads por canal de aquisição</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelMetrics}
                        dataKey="leads"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ source, leads, percent }) => 
                          `${formatSourceName(source)}: ${leads} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {channelMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getSourceColor(entry.source)} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, formatSourceName(name)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Rate by Source Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Conversão por Canal</CardTitle>
                <CardDescription>Percentual de leads convertidos por origem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={channelMetrics} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis 
                        dataKey="source" 
                        type="category" 
                        width={100}
                        tickFormatter={formatSourceName}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversão']}
                        labelFormatter={formatSourceName}
                      />
                      <Bar dataKey="conversionRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Canal</CardTitle>
              <CardDescription>Métricas completas de cada canal de aquisição com ROI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Canal</th>
                      <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Leads</th>
                      <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Convertidos</th>
                      <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Taxa</th>
                      <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Receita</th>
                      <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Custo</th>
                      <th className="text-right py-3 px-4 font-medium whitespace-nowrap">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelMetrics.map((channel, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="flex-shrink-0" style={{ color: getSourceColor(channel.source) }}>
                              {getSourceIcon(channel.source)}
                            </span>
                            <span className="font-medium">{formatSourceName(channel.source)}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 whitespace-nowrap">{channel.leads}</td>
                        <td className="text-right py-3 px-4 whitespace-nowrap">{channel.converted}</td>
                        <td className="text-right py-3 px-4 whitespace-nowrap">
                          <Badge variant={channel.conversionRate >= totals.avgConversionRate ? 'default' : 'secondary'}>
                            {channel.conversionRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 whitespace-nowrap">
                          R$ {channel.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="text-right py-3 px-4 whitespace-nowrap">
                          {channel.acquisitionCost > 0 
                            ? `R$ ${channel.acquisitionCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
                            : <span className="text-muted-foreground">-</span>
                          }
                        </td>
                        <td className="text-right py-3 px-4 whitespace-nowrap">
                          {channel.roi !== null ? (
                            <Badge variant={channel.roi >= 0 ? 'default' : 'destructive'}>
                              {channel.roi >= 0 ? '+' : ''}{channel.roi.toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Campanhas</CardTitle>
              <CardDescription>Performance das principais campanhas por número de leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignMetrics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="campaign" 
                      type="category" 
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="converted" name="Convertidos" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Campanha</CardTitle>
              <CardDescription>Métricas completas de cada campanha com ROI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Campanha</th>
                      <th className="text-left py-3 px-4 font-medium">Canal</th>
                      <th className="text-right py-3 px-4 font-medium">Leads</th>
                      <th className="text-right py-3 px-4 font-medium">Conv.</th>
                      <th className="text-right py-3 px-4 font-medium">Taxa</th>
                      <th className="text-right py-3 px-4 font-medium">Receita</th>
                      <th className="text-right py-3 px-4 font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignMetrics.map((campaign, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium max-w-[150px] truncate" title={campaign.campaign}>
                          {campaign.campaign}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span style={{ color: getSourceColor(campaign.source) }}>
                              {getSourceIcon(campaign.source)}
                            </span>
                            <span>{formatSourceName(campaign.source)}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{campaign.leads}</td>
                        <td className="text-right py-3 px-4">{campaign.converted}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant={campaign.conversionRate >= totals.avgConversionRate ? 'default' : 'secondary'}>
                            {campaign.conversionRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4">
                          R$ {campaign.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="text-right py-3 px-4">
                          {campaign.roi !== null ? (
                            <Badge variant={campaign.roi >= 0 ? 'default' : 'destructive'}>
                              {campaign.roi >= 0 ? '+' : ''}{campaign.roi.toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Leads por Canal</CardTitle>
              <CardDescription>Tendência mensal de aquisição por origem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leadTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="facebook" name="Facebook" stroke="#1877F2" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#E4405F" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="google" name="Google Ads" stroke="#EA4335" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#25D366" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="website" name="Website" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="outros" name="Outros" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stacked Area for cumulative view */}
          <Card>
            <CardHeader>
              <CardTitle>Volume Acumulado por Canal</CardTitle>
              <CardDescription>Composição mensal de leads por origem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="facebook" name="Facebook" stackId="a" fill="#1877F2" />
                    <Bar dataKey="instagram" name="Instagram" stackId="a" fill="#E4405F" />
                    <Bar dataKey="google" name="Google Ads" stackId="a" fill="#EA4335" />
                    <Bar dataKey="whatsapp" name="WhatsApp" stackId="a" fill="#25D366" />
                    <Bar dataKey="website" name="Website" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="outros" name="Outros" stackId="a" fill="hsl(var(--muted-foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
