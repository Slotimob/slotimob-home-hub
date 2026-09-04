import { useNavigate } from 'react-router-dom';
import { differenceInDays, format, parseISO, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Building2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useRentalMetrics } from '@/hooks/useRentalMetrics';
import { parseDateOnly } from "@/lib/date-only";

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AlugueisEmAberto() {
  const navigate = useNavigate();

  // Janela ampla: cobre cobranças em aberto dos últimos 12 meses
  const from = startOfMonth(subMonths(new Date(), 12));
  const to = new Date();

  const { data, isLoading } = useRentalMetrics({ from, to, refreshKey: 0 });
  const items = data?.properties_with_open_rentals ?? [];
  const totalAmount = items.reduce((s, i) => s + i.total_open, 0);
  const totalCharges = items.reduce((s, i) => s + i.transactions_count, 0);

  const assetRoute = (item: (typeof items)[number]) =>
    item.unit_id
      ? `/units/${item.unit_id}`
      : item.property_id
        ? `/real-estate/${item.property_id}`
        : null;

  return (
    <AppLayout>
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 gap-1 text-muted-foreground"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Imóveis com aluguel em aberto
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ativos com cobranças de aluguel pendentes ou vencidas nos últimos 12 meses.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/finance/transactions?status=overdue&type=income')}>
            Ver lançamentos
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Imóveis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? '—' : items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cobranças</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? '—' : totalCharges}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total em aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {isLoading ? '—' : fmtCurrency(totalAmount)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listagem</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum imóvel com aluguel em aberto. ✓
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imóvel / Unidade</TableHead>
                      <TableHead className="text-center">Cobranças</TableHead>
                      <TableHead>Vencimento mais antigo</TableHead>
                      <TableHead className="text-center">Atraso</TableHead>
                      <TableHead className="text-right">Total em aberto</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => {
                      const oldestDue = parseDateOnly(item.oldest_due_date);
                      const daysOverdue = oldestDue
                        ? differenceInDays(startOfDay(new Date()), startOfDay(oldestDue))
                        : 0;
                      const route = assetRoute(item);
                      return (
                        <TableRow
                          key={`${item.unit_id ?? item.property_id ?? 'x'}-${i}`}
                          className={route ? 'cursor-pointer' : undefined}
                          onClick={() => route && navigate(route)}
                        >
                          <TableCell className="font-medium">{item.property_name}</TableCell>
                          <TableCell className="text-center">{item.transactions_count}</TableCell>
                          <TableCell>
                            {format(parseISO(item.oldest_due_date), "dd 'de' MMM yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            {daysOverdue > 0 ? (
                              <Badge variant="destructive" className="text-[11px]">
                                {daysOverdue}d
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[11px]">
                                A vencer
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {fmtCurrency(item.total_open)}
                          </TableCell>
                          <TableCell>
                            {route && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
