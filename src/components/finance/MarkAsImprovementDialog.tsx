import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Hammer, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { IMPROVEMENT_TYPE_LABELS } from '@/lib/improvement-types';
import { AssetType, useCreateImprovement } from '@/hooks/useAssetFinancials';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function getTransactionAssetTarget(transaction: any): {
  assetType: AssetType;
  assetId: string;
} | null {
  if (!transaction) return null;
  if (transaction.unit_id) return { assetType: 'unit', assetId: transaction.unit_id };
  if (transaction.property_id) return { assetType: 'property', assetId: transaction.property_id };
  return null;
}

export function getTransactionAssetLabel(transaction: any): string {
  return (
    transaction?.unit?.name ||
    transaction?.units?.name ||
    transaction?.unit_name ||
    transaction?.property?.title ||
    transaction?.properties?.title ||
    transaction?.property_name ||
    'Ativo vinculado'
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
}

export function MarkAsImprovementDialog({ open, onOpenChange, transaction }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateImprovement();
  const [improvementType, setImprovementType] = useState('reforma_geral');
  const [affectsMarketValue, setAffectsMarketValue] = useState(true);

  useEffect(() => {
    if (open) {
      setImprovementType('reforma_geral');
      setAffectsMarketValue(true);
    }
  }, [open]);

  const target = getTransactionAssetTarget(transaction);
  if (!transaction || !target) return null;

  const handleConfirm = async () => {
    try {
      await createMutation.mutateAsync({
        assetType: target.assetType,
        assetId: target.assetId,
        improvement_type: improvementType,
        description: transaction.description || 'Benfeitoria',
        cost: Number(transaction.amount) || 0,
        completed_at: transaction.transaction_date,
        affects_market_value: affectsMarketValue,
        financial_transaction_id: transaction.id,
      });
      queryClient.invalidateQueries({
        queryKey: ['asset-improvements', target.assetType, target.assetId],
      });
      queryClient.invalidateQueries({ queryKey: ['improvement-linked-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-improvements'] });
      toast({
        title: 'Benfeitoria registrada e vinculada a este lançamento',
        duration: 1000,
      });
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao registrar benfeitoria', variant: 'destructive', duration: 1000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />
            Marcar como Benfeitoria
          </DialogTitle>
          <DialogDescription>
            Este lançamento será registrado como benfeitoria do ativo e já nascerá vinculado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Descrição</span>
              <span className="font-medium truncate max-w-[220px] text-right">
                {transaction.description || 'Sem descrição'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-medium">{fmtCurrency(Number(transaction.amount))}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">
                {transaction.transaction_date
                  ? format(new Date(transaction.transaction_date), 'dd/MM/yyyy')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Ativo</span>
              <span className="font-medium truncate max-w-[220px] text-right">
                {getTransactionAssetLabel(transaction)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Tipo de benfeitoria *</Label>
            <Select value={improvementType} onValueChange={setImprovementType}>
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(IMPROVEMENT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="mark-affects-mv"
              checked={affectsMarketValue}
              onCheckedChange={(c) => setAffectsMarketValue(c === true)}
            />
            <Label htmlFor="mark-affects-mv" className="text-sm cursor-pointer">
              Esta benfeitoria afeta o valor de mercado
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Registrar benfeitoria
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
