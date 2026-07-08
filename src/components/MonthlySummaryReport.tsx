import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, FileText, TrendingUp, TrendingDown, Users, Wallet, Calendar, Target, Loader2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createWorkbook, addAoaSheet, addJsonSheet, downloadWorkbook } from '@/utils/excelUtils';

interface MonthlyData {
  period: string;
  totalSales: number;
  totalCommissions: number;
  newLeads: number;
  visitsCompleted: number;
  visitsScheduled: number;
  dealsWon: number;
  dealsInProgress: number;
  conversionRate: number;
  topProperties: Array<{ name: string; deals: number }>;
}

interface Comparison {
  salesChange: number;
  commissionsChange: number;
  leadsChange: number;
  visitsChange: number;
  dealsChange: number;
}

const ChangeIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  if (value === 0) return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> 0%</span>;
  if (value > 0) return <span className="text-green-600 flex items-center gap-1"><ArrowUp className="h-3 w-3" /> +{value.toFixed(1)}{suffix}</span>;
  return <span className="text-red-600 flex items-center gap-1"><ArrowDown className="h-3 w-3" /> {value.toFixed(1)}{suffix}</span>;
};

export const MonthlySummaryReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [currentMonth, setCurrentMonth] = useState<MonthlyData | null>(null);
  const [previousMonth, setPreviousMonth] = useState<MonthlyData | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [userName, setUserName] = useState('');

  const thisMonthStart = startOfMonth(new Date());
  const thisMonthEnd = endOfMonth(new Date());
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

  useEffect(() => {
    if (user) {
      loadMonthlyData();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user?.id)
      .maybeSingle();
    
    if (data) {
      setUserName(data.full_name);
      setEmail(data.email);
    }
  };

  const loadMonthData = async (monthStart: Date, monthEnd: Date): Promise<MonthlyData> => {
    const startStr = monthStart.toISOString();
    const endStr = monthEnd.toISOString();
    const startDateStr = monthStart.toISOString().split('T')[0];
    const endDateStr = monthEnd.toISOString().split('T')[0];

    // Sales
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_value, commission_value')
      .gte('sale_date', startDateStr)
      .lte('sale_date', endDateStr);

    const totalSales = (sales || []).reduce((sum, s) => sum + Number(s.sale_value || 0), 0);
    const totalCommissions = (sales || []).reduce((sum, s) => sum + Number(s.commission_value || 0), 0);

    // New leads
    const { count: newLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startStr)
      .lte('created_at', endStr);

    // Visits
    const { data: visits } = await supabase
      .from('visits')
      .select('status')
      .gte('scheduled_at', startStr)
      .lte('scheduled_at', endStr);

    const visitsScheduled = visits?.length || 0;
    const visitsCompleted = visits?.filter(v => v.status === 'completed').length || 0;

    // Deals won
    const { count: dealsWon } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('stage', 'won')
      .gte('updated_at', startStr)
      .lte('updated_at', endStr);

    // Deals in progress
    const { count: dealsInProgress } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .not('stage', 'in', '("won","lost")');

    // Conversion rate
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true });

    const { count: totalWonDeals } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('stage', 'won');

    const conversionRate = totalLeads ? ((totalWonDeals || 0) / totalLeads) * 100 : 0;

    // Top properties
    const { data: dealsWithProperties } = await supabase
      .from('deals')
      .select('property_id, properties(name)')
      .not('stage', 'eq', 'lost')
      .gte('created_at', startStr)
      .lte('created_at', endStr);

    const propertyDeals: Record<string, { name: string; deals: number }> = {};
    (dealsWithProperties || []).forEach((d: any) => {
      const propName = d.properties?.name || 'Sem empreendimento';
      if (!propertyDeals[propName]) propertyDeals[propName] = { name: propName, deals: 0 };
      propertyDeals[propName].deals++;
    });
    const topProperties = Object.values(propertyDeals)
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 5);

    return {
      period: format(monthStart, 'MMMM yyyy', { locale: ptBR }),
      totalSales,
      totalCommissions,
      newLeads: newLeads || 0,
      visitsCompleted,
      visitsScheduled,
      dealsWon: dealsWon || 0,
      dealsInProgress: dealsInProgress || 0,
      conversionRate,
      topProperties,
    };
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const loadMonthlyData = async () => {
    try {
      setIsLoading(true);
      
      const current = await loadMonthData(lastMonthStart, lastMonthEnd);
      const previous = await loadMonthData(startOfMonth(subMonths(new Date(), 2)), endOfMonth(subMonths(new Date(), 2)));
      
      setCurrentMonth(current);
      setPreviousMonth(previous);
      
      setComparison({
        salesChange: calculateChange(current.totalSales, previous.totalSales),
        commissionsChange: calculateChange(current.totalCommissions, previous.totalCommissions),
        leadsChange: calculateChange(current.newLeads, previous.newLeads),
        visitsChange: calculateChange(current.visitsCompleted, previous.visitsCompleted),
        dealsChange: calculateChange(current.dealsWon, previous.dealsWon),
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!currentMonth || !comparison) return;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO MENSAL', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${currentMonth.period.toUpperCase()}`, pageWidth / 2, 32, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    let yPos = 55;
    
    // Main metrics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Métricas Principais', 14, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Métrica', 'Valor', 'Variação MoM']],
      body: [
        ['Total em Vendas', `R$ ${currentMonth.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `${comparison.salesChange >= 0 ? '+' : ''}${comparison.salesChange.toFixed(1)}%`],
        ['Total em Comissões', `R$ ${currentMonth.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `${comparison.commissionsChange >= 0 ? '+' : ''}${comparison.commissionsChange.toFixed(1)}%`],
        ['Novos Leads', currentMonth.newLeads.toString(), `${comparison.leadsChange >= 0 ? '+' : ''}${comparison.leadsChange.toFixed(1)}%`],
        ['Visitas Realizadas', currentMonth.visitsCompleted.toString(), `${comparison.visitsChange >= 0 ? '+' : ''}${comparison.visitsChange.toFixed(1)}%`],
        ['Negócios Fechados', currentMonth.dealsWon.toString(), `${comparison.dealsChange >= 0 ? '+' : ''}${comparison.dealsChange.toFixed(1)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 10 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Additional metrics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes', 14, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Valor']],
      body: [
        ['Visitas Agendadas', currentMonth.visitsScheduled.toString()],
        ['Taxa de Realização', `${currentMonth.visitsScheduled ? ((currentMonth.visitsCompleted / currentMonth.visitsScheduled) * 100).toFixed(0) : 0}%`],
        ['Negócios em Andamento', currentMonth.dealsInProgress.toString()],
        ['Taxa de Conversão Geral', `${currentMonth.conversionRate.toFixed(1)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 10 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Top Properties
    if (currentMonth.topProperties.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Empreendimentos', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Empreendimento', 'Negociações']],
        body: currentMonth.topProperties.map(p => [p.name, p.deals.toString()]),
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

    doc.save(`resumo-mensal-${format(new Date(), 'yyyy-MM')}.pdf`);
    toast({ title: 'PDF baixado!', description: 'O relatório foi salvo com sucesso.' });
  };

  const downloadExcel = async () => {
    if (!currentMonth || !comparison) return;

    const workbook = createWorkbook();
    
    const summaryData = [
      ['RESUMO MENSAL - SLOTIMOB'],
      ['Período:', currentMonth.period],
      [''],
      ['MÉTRICAS PRINCIPAIS', 'Valor', 'Variação MoM'],
      ['Total em Vendas', currentMonth.totalSales, `${comparison.salesChange.toFixed(1)}%`],
      ['Total em Comissões', currentMonth.totalCommissions, `${comparison.commissionsChange.toFixed(1)}%`],
      ['Novos Leads', currentMonth.newLeads, `${comparison.leadsChange.toFixed(1)}%`],
      ['Visitas Realizadas', currentMonth.visitsCompleted, `${comparison.visitsChange.toFixed(1)}%`],
      ['Negócios Fechados', currentMonth.dealsWon, `${comparison.dealsChange.toFixed(1)}%`],
      [''],
      ['DETALHES'],
      ['Visitas Agendadas', currentMonth.visitsScheduled],
      ['Negócios em Andamento', currentMonth.dealsInProgress],
      ['Taxa de Conversão (%)', currentMonth.conversionRate.toFixed(1)],
    ];

    addAoaSheet(workbook, summaryData, 'Resumo Mensal');

    if (currentMonth.topProperties.length > 0) {
      addJsonSheet(workbook, currentMonth.topProperties.map(p => ({
        'Empreendimento': p.name,
        'Negociações': p.deals,
      })), 'Top Empreendimentos');
    }

    await downloadWorkbook(workbook, `resumo-mensal-${format(new Date(), 'yyyy-MM')}.xlsx`);
    toast({ title: 'Excel baixado!', description: 'O arquivo foi salvo com sucesso.' });
  };

  const sendEmail = async () => {
    if (!currentMonth || !email) return;

    try {
      setIsSending(true);

      const { error } = await supabase.functions.invoke('send-weekly-report', {
        body: { reportType: 'monthly' },
      });

      if (error) throw error;

      toast({
        title: 'Email enviado!',
        description: `O resumo mensal foi enviado para ${email}`,
      });
      setEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!currentMonth || !comparison) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo Mensal
            </CardTitle>
            <CardDescription>{currentMonth.period} (comparado ao mês anterior)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => await downloadPDF()}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={downloadExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar Resumo por Email</DialogTitle>
                  <DialogDescription>
                    O resumo mensal será enviado para o email informado.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly-email">Email</Label>
                    <Input
                      id="monthly-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={sendEmail} disabled={isSending || !email}>
                    {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    Enviar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Vendas
            </div>
            <p className="mt-2 text-2xl font-bold">
              R$ {currentMonth.totalSales.toLocaleString('pt-BR')}
            </p>
            <div className="mt-1 text-xs">
              <ChangeIndicator value={comparison.salesChange} suffix="%" />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Comissões
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">
              R$ {currentMonth.totalCommissions.toLocaleString('pt-BR')}
            </p>
            <div className="mt-1 text-xs">
              <ChangeIndicator value={comparison.commissionsChange} suffix="%" />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Novos Leads
            </div>
            <p className="mt-2 text-2xl font-bold">{currentMonth.newLeads}</p>
            <div className="mt-1 text-xs">
              <ChangeIndicator value={comparison.leadsChange} suffix="%" />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Visitas
            </div>
            <p className="mt-2 text-2xl font-bold">{currentMonth.visitsCompleted}</p>
            <div className="mt-1 text-xs">
              <ChangeIndicator value={comparison.visitsChange} suffix="%" />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Fechados
            </div>
            <p className="mt-2 text-2xl font-bold">{currentMonth.dealsWon}</p>
            <div className="mt-1 text-xs">
              <ChangeIndicator value={comparison.dealsChange} suffix="%" />
            </div>
          </div>
        </div>

        {currentMonth.topProperties.length > 0 && (
          <div className="mt-6 rounded-lg border bg-card p-4">
            <h4 className="font-medium mb-3">Top Empreendimentos do Mês</h4>
            <div className="space-y-2">
              {currentMonth.topProperties.map((prop, index) => (
                <div key={prop.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {index + 1}
                    </span>
                    {prop.name}
                  </span>
                  <span className="font-medium">{prop.deals} negociações</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
