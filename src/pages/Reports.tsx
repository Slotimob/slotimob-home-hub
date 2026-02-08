import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Download, TrendingUp, Users, DollarSign, Building2, Calendar, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createWorkbook, addJsonSheet, downloadWorkbook } from '@/utils/excelUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChannelPerformanceDashboard } from '@/components/ChannelPerformanceDashboard';
import { DimobReportTab } from '@/components/reports/DimobReportTab';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Reports = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState('6');
  const [isLoading, setIsLoading] = useState(true);
  
  const [salesData, setSalesData] = useState<any[]>([]);
  const [leadsByOrigin, setLeadsByOrigin] = useState<any[]>([]);
  const [visitStats, setVisitStats] = useState<any[]>([]);
  const [commissionData, setCommissionData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState({ total: 0, converted: 0, rate: 0 });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, period]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const months = parseInt(period);
      const startDate = startOfMonth(subMonths(new Date(), months - 1));
      
      // Sales by month
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_value, commission_value, sale_date')
        .gte('sale_date', startDate.toISOString().split('T')[0]);

      // Process sales by month
      const salesByMonth: Record<string, { vendas: number; comissoes: number }> = {};
      (sales || []).forEach(sale => {
        const month = format(new Date(sale.sale_date), 'MMM/yy', { locale: ptBR });
        if (!salesByMonth[month]) salesByMonth[month] = { vendas: 0, comissoes: 0 };
        salesByMonth[month].vendas += Number(sale.sale_value || 0);
        salesByMonth[month].comissoes += Number(sale.commission_value || 0);
      });
      setSalesData(Object.entries(salesByMonth).map(([mes, data]) => ({ mes, ...data })));
      setCommissionData(Object.entries(salesByMonth).map(([mes, data]) => ({ mes, comissao: data.comissoes })));

      // Leads by origin
      const { data: leads } = await supabase
        .from('leads')
        .select('origin')
        .gte('created_at', startDate.toISOString());

      const originCounts: Record<string, number> = {};
      (leads || []).forEach(lead => {
        const origin = lead.origin || 'Não informado';
        originCounts[origin] = (originCounts[origin] || 0) + 1;
      });
      setLeadsByOrigin(Object.entries(originCounts).map(([name, value]) => ({ name, value })));

      // Visits stats
      const { data: visits } = await supabase
        .from('visits')
        .select('status, scheduled_at')
        .gte('scheduled_at', startDate.toISOString());

      const visitsByMonth: Record<string, { agendadas: number; realizadas: number; canceladas: number }> = {};
      (visits || []).forEach(visit => {
        const month = format(new Date(visit.scheduled_at), 'MMM/yy', { locale: ptBR });
        if (!visitsByMonth[month]) visitsByMonth[month] = { agendadas: 0, realizadas: 0, canceladas: 0 };
        visitsByMonth[month].agendadas++;
        if (visit.status === 'completed') visitsByMonth[month].realizadas++;
        if (visit.status === 'cancelled') visitsByMonth[month].canceladas++;
      });
      setVisitStats(Object.entries(visitsByMonth).map(([mes, data]) => ({ mes, ...data })));

      // Conversion rate
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());
      
      const { count: convertedDeals } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'won')
        .gte('created_at', startDate.toISOString());

      setConversionData({
        total: totalLeads || 0,
        converted: convertedDeals || 0,
        rate: totalLeads ? ((convertedDeals || 0) / totalLeads) * 100 : 0,
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao carregar relatórios',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const workbook = createWorkbook();
      
      // Sales sheet
      addJsonSheet(workbook, salesData.map(d => ({
        'Mês': d.mes,
        'Vendas (R$)': d.vendas,
        'Comissões (R$)': d.comissoes,
      })), 'Vendas');
      
      // Leads sheet
      addJsonSheet(workbook, leadsByOrigin.map(d => ({
        'Origem': d.name,
        'Quantidade': d.value,
      })), 'Leads por Origem');
      
      // Visits sheet
      addJsonSheet(workbook, visitStats.map(d => ({
        'Mês': d.mes,
        'Agendadas': d.agendadas,
        'Realizadas': d.realizadas,
        'Canceladas': d.canceladas,
      })), 'Visitas');
      
      await downloadWorkbook(workbook, `relatorio-slotimob-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast({
        title: 'Excel exportado!',
        description: 'O arquivo foi baixado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO SLOTIMOB', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Últimos ${period} meses`, pageWidth / 2, 32, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      
      let yPos = 55;
      
      // Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Geral', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total em Vendas', `R$ ${totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Total em Comissões', `R$ ${totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Taxa de Conversão', `${conversionData.rate.toFixed(1)}% (${conversionData.converted} de ${conversionData.total} leads)`],
          ['Visitas Realizadas', `${completedVisits} de ${totalVisits} (${totalVisits ? ((completedVisits / totalVisits) * 100).toFixed(0) : 0}%)`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        styles: { fontSize: 10 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Sales by month
      if (salesData.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Vendas por Mês', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Mês', 'Vendas (R$)', 'Comissões (R$)']],
          body: salesData.map(d => [d.mes, d.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), d.comissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 10 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Leads by origin
      if (leadsByOrigin.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Leads por Origem', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Origem', 'Quantidade']],
          body: leadsByOrigin.map(d => [d.name, d.value.toString()]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 10 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Check if we need a new page
      if (yPos > 230 && visitStats.length > 0) {
        doc.addPage();
        yPos = 20;
      }
      
      // Visits by month
      if (visitStats.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Visitas por Mês', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Mês', 'Agendadas', 'Realizadas', 'Canceladas']],
          body: visitStats.map(d => [d.mes, d.agendadas.toString(), d.realizadas.toString(), d.canceladas.toString()]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 10 },
        });
      }
      
      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - SLOTIMOB`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      doc.save(`relatorio-slotimob-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({
        title: 'PDF exportado!',
        description: 'O arquivo foi baixado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportToGoogleSheets = () => {
    // Prepare data as CSV for Google Sheets import
    const csvData = [
      ['Relatório SLOTIMOB', '', '', ''],
      ['Período:', `Últimos ${period} meses`, '', ''],
      ['', '', '', ''],
      ['VENDAS POR MÊS', '', '', ''],
      ['Mês', 'Vendas (R$)', 'Comissões (R$)', ''],
      ...salesData.map(d => [d.mes, d.vendas, d.comissoes, '']),
      ['', '', '', ''],
      ['LEADS POR ORIGEM', '', '', ''],
      ['Origem', 'Quantidade', '', ''],
      ...leadsByOrigin.map(d => [d.name, d.value, '', '']),
      ['', '', '', ''],
      ['VISITAS POR MÊS', '', '', ''],
      ['Mês', 'Agendadas', 'Realizadas', 'Canceladas'],
      ...visitStats.map(d => [d.mes, d.agendadas, d.realizadas, d.canceladas]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Open Google Sheets with import option
    const googleSheetsUrl = 'https://docs.google.com/spreadsheets/create';
    window.open(googleSheetsUrl, '_blank');
    
    // Also download CSV for manual import
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-slotimob-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV baixado!',
      description: 'O Google Sheets foi aberto. Importe o arquivo CSV baixado para criar a planilha.',
    });
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const totalSales = salesData.reduce((sum, d) => sum + d.vendas, 0);
  const totalCommissions = salesData.reduce((sum, d) => sum + d.comissoes, 0);
  const totalVisits = visitStats.reduce((sum, d) => sum + d.agendadas, 0);
  const completedVisits = visitStats.reduce((sum, d) => sum + d.realizadas, 0);

  return (
    <AppLayout title="Relatórios - Visão Geral">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToGoogleSheets}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Google Sheets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total em Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalSales.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total em Comissões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalCommissions.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {conversionData.rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {conversionData.converted} de {conversionData.total} leads
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Visitas Realizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedVisits}</div>
              <p className="text-xs text-muted-foreground">
                de {totalVisits} agendadas ({totalVisits ? ((completedVisits / totalVisits) * 100).toFixed(0) : 0}%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="channels" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="channels">Performance por Canal</TabsTrigger>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="visits">Visitas</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
            <TabsTrigger value="dimob">DIMOB / Fiscal</TabsTrigger>
          </TabsList>

          <TabsContent value="channels">
            <ChannelPerformanceDashboard />
          </TabsContent>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Mês</CardTitle>
                <CardDescription>Evolução das vendas no período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Leads por Origem</CardTitle>
                <CardDescription>Distribuição de leads por canal de origem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadsByOrigin}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {leadsByOrigin.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits">
            <Card>
              <CardHeader>
                <CardTitle>Visitas por Mês</CardTitle>
                <CardDescription>Comparativo de visitas agendadas, realizadas e canceladas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visitStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Line type="monotone" dataKey="agendadas" stroke="hsl(var(--primary))" name="Agendadas" />
                      <Line type="monotone" dataKey="realizadas" stroke="hsl(var(--chart-2))" name="Realizadas" />
                      <Line type="monotone" dataKey="canceladas" stroke="hsl(var(--destructive))" name="Canceladas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Comissões por Mês</CardTitle>
                <CardDescription>Evolução das comissões recebidas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={commissionData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="comissao" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dimob">
            <DimobReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
