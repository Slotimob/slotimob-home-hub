import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, DollarSign, CheckCircle, XCircle, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Deal } from '@/pages/Pipeline';

interface CreateCommissionDialogProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateCommissionDialog = ({
  deal,
  open,
  onOpenChange,
  onSuccess,
}: CreateCommissionDialogProps) => {
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [saleValue, setSaleValue] = useState<number>(deal?.estimated_value || 0);
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());

  // Calculate commission
  const commissionValue = (saleValue * commissionRate) / 100;

  const handleCreate = async () => {
    if (!deal) return;
    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create income transaction for commission
      const { error } = await supabase.from('financial_transactions').insert({
        broker_id: effectiveBrokerId || user.id,
        type: 'income',
        description: `Comissão - ${deal.lead?.name || 'Lead'} - ${deal.property?.name || 'Imóvel'}${deal.unit ? ` - Unid. ${deal.unit.unit_number}` : ''}`,
        amount: commissionValue,
        transaction_date: format(transactionDate, 'yyyy-MM-dd'),
        due_date: format(transactionDate, 'yyyy-MM-dd'),
        status: 'pending',
        deal_id: deal.id,
        property_id: deal.property.id,
        unit_id: deal.unit?.id || null,
        lead_id: deal.lead.id,
        notes: `Venda fechada: R$ ${saleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Taxa: ${commissionRate}%`,
      });

      if (error) throw error;

      toast({
        title: 'Comissão lançada!',
        description: `Receita de R$ ${commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} criada no financeiro.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar lançamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Parabéns pela venda!
          </DialogTitle>
          <DialogDescription>
            Deseja lançar a comissão dessa venda no módulo financeiro?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sale info */}
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {deal.lead?.name || 'Lead'}
            </p>
            <p className="text-xs text-muted-foreground">
              {deal.property?.name || 'Sem imóvel'}{deal.unit ? ` - Unid. ${deal.unit.unit_number}` : ''}
            </p>
          </div>

          {/* Sale Value */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Valor da Venda
            </Label>
            <CurrencyInput
              value={saleValue?.toString() || ''}
              onChange={(value) => setSaleValue(parseFloat(value) || 0)}
              placeholder="0,00"
            />
          </div>

          {/* Commission Rate */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Taxa de Comissão (%)
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commissionRate}
              onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
              placeholder="5"
            />
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Data do Lançamento
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={transactionDate}
                  onSelect={(date) => date && setTransactionDate(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Commission Preview */}
          {saleValue > 0 && commissionRate > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Comissão a receber:</span>
                <span className="font-semibold text-primary text-lg">
                  R$ {commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto">
            <XCircle className="mr-2 h-4 w-4" />
            Pular
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || saleValue <= 0} className="w-full sm:w-auto">
            <DollarSign className="mr-2 h-4 w-4" />
            {isCreating ? 'Lançando...' : 'Lançar Comissão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
