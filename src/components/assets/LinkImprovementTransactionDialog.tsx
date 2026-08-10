import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link2, Search, Check, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AssetType, useUnitFinancialTransactions } from '@/hooks/useAssetFinancials';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const statusLabel = (s?: string | null) =>
  s === 'paid' ? 'Pago' : s === 'pending' ? 'Pendente' : s || '—';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType: AssetType;
  assetId: string;
  improvementId: string;
  improvementDescription?: string;
  currentTransactionId?: string | null;
  onSelect: (transactionId: string) => void;
  isSaving?: boolean;
}

export function LinkImprovementTransactionDialog({
  open,
  onOpenChange,
  assetType,
  assetId,
  improvementId,
  improvementDescription,
  currentTransactionId,
  onSelect,
  isSaving,
}: Props) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('all');

  const { data: transactions = [], isLoading } = useUnitFinancialTransactions(assetType, assetId);

  const txIds = useMemo(() => transactions.map((t) => t.id), [transactions]);

  // Which candidate transactions are already linked to some improvement (and which one)
  const { data: linkedMap = {} } = useQuery({
    queryKey: ['improvement-linked-transactions', assetType, assetId, txIds.length],
    queryFn: async () => {
      if (txIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from('asset_improvements')
        .select('id, financial_transaction_id')
        .in('financial_transaction_id', txIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        if (row.financial_transaction_id) map[row.financial_transaction_id] = row.id;
      });
      return map;
    },
    enabled: open && txIds.length > 0,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (q && !(t.description || '').toLowerCase().includes(q)) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (dateFrom && t.transaction_date < dateFrom) return false;
      if (dateTo && t.transaction_date > dateTo) return false;
      return true;
    });
  }, [transactions, search, status, dateFrom, dateTo]);

  const hasCandidates = transactions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Vincular Lançamento Financeiro
          </DialogTitle>
          <DialogDescription>
            Selecione a despesa que corresponde à benfeitoria
            {improvementDescription ? ` "${improvementDescription}"` : ''}. Este vínculo confirma
            que a benfeitoria já foi lançada no financeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-[300px] overflow-y-auto rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !hasCandidates ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Nenhuma despesa encontrada para este imóvel.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lance uma despesa em Financeiro &gt; Lançamentos, ou mantenha esta benfeitoria sem
                  vínculo por enquanto.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum lançamento corresponde aos filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="p-1 space-y-1">
                {filtered.map((tx) => {
                  const linkedTo = linkedMap[tx.id];
                  const isThis = tx.id === currentTransactionId || linkedTo === improvementId;
                  const isOther = !!linkedTo && !isThis;
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      disabled={isOther || isSaving}
                      onClick={() => onSelect(tx.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-md border transition-all',
                        !isOther && 'hover:bg-accent/50',
                        isThis && 'bg-emerald-500/10 border-emerald-500/30',
                        isOther && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tx.description || 'Sem descrição'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(tx.transaction_date), 'dd/MM/yyyy')}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {statusLabel(tx.status)}
                            </Badge>
                          </div>
                          {isOther && (
                            <p className="text-[10px] text-amber-600 mt-1">
                              Já vinculado a outra benfeitoria
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold whitespace-nowrap">
                            {fmtCurrency(tx.amount)}
                          </span>
                          {isThis ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
