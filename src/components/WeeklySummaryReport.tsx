import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, FileText, TrendingUp, Users, DollarSign, Calendar, Target, Building2, Loader2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createWorkbook, addAoaSheet, addJsonSheet, downloadWorkbook } from '@/utils/excelUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WeeklyData {
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
  upcomingActivities: number;
}

export const WeeklySummaryReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [userName, setUserName] = useState('');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

  useEffect(() => {
    if (user) {
      loadWeeklyData();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user?.id)
      .single();
    
    if (data) {
      setUserName(data.full_name);
      setEmail(data.email);
    }
  };

  const loadWeeklyData = async () => {
    try {
      setIsLoading(true);

      // Sales this week
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_value, commission_value')
        .gte('sale_date', lastWeekStart.toISOString().split('T')[0])
        .lte('sale_date', lastWeekEnd.toISOString().split('T')[0]);

      const totalSales = (sales || []).reduce((sum, s) => sum + Number(s.sale_value || 0), 0);
      const totalCommissions = (sales || []).reduce((sum, s) => sum + Number(s.commission_value || 0), 0);

      // New leads this week
      const { count: newLeads } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', lastWeekStart.toISOString())
        .lte('created_at', lastWeekEnd.toISOString());

      // Visits this week
      const { data: visits } = await supabase
        .from('visits')
        .select('status')
        .gte('scheduled_at', lastWeekStart.toISOString())
        .lte('scheduled_at', lastWeekEnd.toISOString());

      const visitsScheduled = visits?.length || 0;
      const visitsCompleted = visits?.filter(v => v.status === 'completed').length || 0;

      // Deals won this week
      const { count: dealsWon } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'won')
        .gte('updated_at', lastWeekStart.toISOString())
        .lte('updated_at', lastWeekEnd.toISOString());

      // Deals in progress
      const { count: dealsInProgress } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .not('stage', 'in', '("won","lost")');

      // Conversion rate (leads to won deals)
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true });

      const { count: totalWonDeals } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'won');

      const conversionRate = totalLeads ? ((totalWonDeals || 0) / totalLeads) * 100 : 0;

      // Top properties by deals
      const { data: dealsWithProperties } = await supabase
        .from('deals')
        .select('property_id, properties(name)')
        .not('stage', 'eq', 'lost');

      const propertyDeals: Record<string, { name: string; deals: number }> = {};
      (dealsWithProperties || []).forEach((d: any) => {
        const propName = d.properties?.name || 'Sem empreendimento';
        if (!propertyDeals[propName]) propertyDeals[propName] = { name: propName, deals: 0 };
        propertyDeals[propName].deals++;
      });
      const topProperties = Object.values(propertyDeals)
        .sort((a, b) => b.deals - a.deals)
        .slice(0, 3);

      // Upcoming activities
      const { count: upcomingActivities } = await supabase
        .from('schedule_activities')
        .select('id', { count: 'exact', head: true })
        .gte('scheduled_at', weekStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
        .eq('is_completed', false);

      setWeeklyData({
        period: `${format(lastWeekStart, 'dd/MM', { locale: ptBR })} - ${format(lastWeekEnd, 'dd/MM/yyyy', { locale: ptBR })}`,
        totalSales,
        totalCommissions,
        newLeads: newLeads || 0,
        visitsCompleted,
        visitsScheduled,
        dealsWon: dealsWon || 0,
        dealsInProgress: dealsInProgress || 0,
        conversionRate,
        topProperties,
        upcomingActivities: upcomingActivities || 0,
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

  const downloadPDF = () => {
    if (!weeklyData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO SEMANAL', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(weeklyData.period, pageWidth / 2, 32, { align: 'center' });
    
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
      head: [['Métrica', 'Valor']],
      body: [
        ['Total em Vendas', `R$ ${weeklyData.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Total em Comissões', `R$ ${weeklyData.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Novos Leads', weeklyData.newLeads.toString()],
        ['Taxa de Conversão', `${weeklyData.conversionRate.toFixed(1)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 10 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Visits
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Visitas', 14, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Valor']],
      body: [
        ['Agendadas', weeklyData.visitsScheduled.toString()],
        ['Realizadas', weeklyData.visitsCompleted.toString()],
        ['Taxa de Realização', `${weeklyData.visitsScheduled ? ((weeklyData.visitsCompleted / weeklyData.visitsScheduled) * 100).toFixed(0) : 0}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 10 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Deals
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Negociações', 14, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Valor']],
      body: [
        ['Fechados na Semana', weeklyData.dealsWon.toString()],
        ['Em Andamento', weeklyData.dealsInProgress.toString()],
        ['Atividades Próxima Semana', weeklyData.upcomingActivities.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 10 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Top Properties
    if (weeklyData.topProperties.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Empreendimentos', 14, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Empreendimento', 'Negociações']],
        body: weeklyData.topProperties.map(p => [p.name, p.deals.toString()]),
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

    doc.save(`resumo-semanal-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'PDF baixado!', description: 'O relatório foi salvo com sucesso.' });
  };

  const downloadExcel = async () => {
    if (!weeklyData) return;

    const workbook = createWorkbook();
    
    const summaryData = [
      ['RESUMO SEMANAL - SLOTIMOB'],
      ['Período:', weeklyData.period],
      [''],
      ['MÉTRICAS PRINCIPAIS'],
      ['Total em Vendas', weeklyData.totalSales],
      ['Total em Comissões', weeklyData.totalCommissions],
      [''],
      ['LEADS E CONVERSÕES'],
      ['Novos Leads', weeklyData.newLeads],
      ['Taxa de Conversão (%)', weeklyData.conversionRate.toFixed(1)],
      [''],
      ['VISITAS'],
      ['Agendadas', weeklyData.visitsScheduled],
      ['Realizadas', weeklyData.visitsCompleted],
      [''],
      ['NEGOCIAÇÕES'],
      ['Fechados na Semana', weeklyData.dealsWon],
      ['Em Andamento', weeklyData.dealsInProgress],
      [''],
      ['ATIVIDADES PRÓXIMA SEMANA', weeklyData.upcomingActivities],
    ];

    addAoaSheet(workbook, summaryData, 'Resumo Semanal');

    if (weeklyData.topProperties.length > 0) {
      addJsonSheet(workbook, weeklyData.topProperties.map(p => ({
        'Empreendimento': p.name,
        'Negociações': p.deals,
      })), 'Top Empreendimentos');
    }

    await downloadWorkbook(workbook, `resumo-semanal-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Excel baixado!', description: 'O arquivo foi salvo com sucesso.' });
  };

  const sendEmail = async () => {
    if (!weeklyData || !email) return;

    try {
      setIsSending(true);

      const { data, error } = await supabase.functions.invoke('send-weekly-report', {
        body: {
          email,
          reportData: weeklyData,
          userName,
        },
      });

      if (error) throw error;

      toast({
        title: 'Email enviado!',
        description: `O resumo semanal foi enviado para ${email}`,
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

  if (!weeklyData) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="h-5 w-5 flex-shrink-0" />
              Resumo Semanal
            </CardTitle>
            <CardDescription className="whitespace-nowrap">{weeklyData.period}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadPDF} className="flex-shrink-0">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={downloadExcel} className="flex-shrink-0">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-shrink-0">
                  <Mail className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Enviar</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar Resumo por Email</DialogTitle>
                  <DialogDescription>
                    O resumo semanal será enviado para o email informado.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Vendas
            </div>
            <p className="mt-2 text-2xl font-bold">
              R$ {weeklyData.totalSales.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Comissões
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">
              R$ {weeklyData.totalCommissions.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Novos Leads
            </div>
            <p className="mt-2 text-2xl font-bold">{weeklyData.newLeads}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Conversão
            </div>
            <p className="mt-2 text-2xl font-bold">{weeklyData.conversionRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visitas
            </h4>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agendadas</span>
                <span className="font-medium">{weeklyData.visitsScheduled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Realizadas</span>
                <span className="font-medium text-green-600">{weeklyData.visitsCompleted}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Negociações
            </h4>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fechados</span>
                <span className="font-medium text-green-600">{weeklyData.dealsWon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Em andamento</span>
                <span className="font-medium text-amber-600">{weeklyData.dealsInProgress}</span>
              </div>
            </div>
          </div>
        </div>

        {weeklyData.topProperties.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Top Empreendimentos</h4>
            <div className="space-y-2">
              {weeklyData.topProperties.map((prop, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
                  <span className="text-sm">{prop.name}</span>
                  <span className="text-sm font-medium">{prop.deals} negociações</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
