import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarDays, 
  DollarSign, 
  CheckCircle, 
  Percent, 
  Home, 
  Building2,
  PartyPopper,
  Banknote,
  FileText,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/hooks/useWorkspace';
import confetti from 'canvas-confetti';
import type { Deal } from '@/pages/Pipeline';
import { useLeaseConversionContext } from '@/hooks/useLeaseConversionContext';

interface DealClosingDialogProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const DealClosingDialog = ({
  deal,
  open,
  onOpenChange,
  onSuccess,
}: DealClosingDialogProps) => {
  const { toast } = useToast();
  const { createContextFromDeal, navigateToCreateLease } = useLeaseConversionContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleValue, setSaleValue] = useState<number>(0);
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [shouldUpdatePropertyStatus, setShouldUpdatePropertyStatus] = useState(true);
  const [shouldCreateTransaction, setShouldCreateTransaction] = useState(true);
  const [shouldCreateLease, setShouldCreateLease] = useState(false);

  // Calculate commission
  const commissionValue = (saleValue * commissionRate) / 100;

  // Get business type label
  const businessType = (deal as any)?.business_type || 'sale';
  const statusLabel = businessType === 'rental' ? 'Alugado' : 'Vendido';
  const statusValue = businessType === 'rental' ? 'rented' : 'sold';

  // Check if this deal can be converted to a lease
  const canCreateLease = businessType === 'rental' && deal?.unit?.id;
  const leaseConversionContext = deal && canCreateLease ? createContextFromDeal(deal) : null;

  // Trigger confetti on open
  useEffect(() => {
    if (open && deal) {
      // Reset form state
      setSaleValue(deal.estimated_value || 0);
      setCommissionRate(5);
      setTransactionDate(new Date());
      setShouldUpdatePropertyStatus(true);
      setShouldCreateTransaction(true);
      // Pre-select lease creation for rental deals
      setShouldCreateLease(businessType === 'rental' && !!deal.unit?.id);

      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#22c55e', '#10b981', '#14b8a6'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#22c55e', '#10b981', '#14b8a6'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [open, deal, businessType]);

  const handleConfirm = async () => {
    if (!deal) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Update property/unit status if requested
      if (shouldUpdatePropertyStatus && deal.unit?.id) {
        // Update status AND set is_occupied = true for rental deals
        const updatePayload: Record<string, unknown> = { 
          status: statusValue as 'available' | 'rented' | 'reserved' | 'sold'
        };
        
        // For rental deals, mark as occupied to update vacancy rate
        if (businessType === 'rental') {
          updatePayload.is_occupied = true;
        }

        const { error: unitError } = await supabase
          .from('units')
          .update(updatePayload)
          .eq('id', deal.unit.id);

        if (unitError) throw unitError;
      }

      // 2. Create financial transaction if requested
      if (shouldCreateTransaction && saleValue > 0) {
        const { error: transactionError } = await supabase.from('financial_transactions').insert({
          broker_id: user.id,
          type: 'income',
          description: `Comissão - ${deal.lead.name} - ${deal.property.name}${deal.unit ? ` - Unid. ${deal.unit.unit_number}` : ''}`,
          amount: commissionValue,
          transaction_date: format(transactionDate, 'yyyy-MM-dd'),
          due_date: format(transactionDate, 'yyyy-MM-dd'),
          status: 'pending',
          deal_id: deal.id,
          property_id: deal.property.id,
          unit_id: deal.unit?.id || null,
          lead_id: deal.lead.id,
          notes: `${businessType === 'rental' ? 'Locação' : 'Venda'} fechada: R$ ${saleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Taxa: ${commissionRate}%`,
        });

        if (transactionError) throw transactionError;
      }

      // Success messages
      const messages: string[] = [];
      if (shouldUpdatePropertyStatus && deal.unit?.id) {
        messages.push(`Imóvel marcado como ${statusLabel.toLowerCase()}`);
      }
      if (shouldCreateTransaction && saleValue > 0) {
        messages.push(`Comissão de R$ ${commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} lançada`);
      }

      // 3. Navigate to create lease if requested (rental deals only)
      if (shouldCreateLease && leaseConversionContext) {
        toast({
          title: '🎉 Negócio fechado com sucesso!',
          description: 'Redirecionando para criar o contrato de locação...',
        });
        onOpenChange(false);
        onSuccess?.();
        // Small delay for toast visibility before navigation
        setTimeout(() => {
          navigateToCreateLease(leaseConversionContext);
        }, 500);
        return;
      }

      toast({
        title: '🎉 Negócio fechado com sucesso!',
        description: messages.length > 0 ? messages.join(' • ') : 'Deal finalizado.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao processar fechamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-green-500" />
            Parabéns! Negócio fechado!
          </DialogTitle>
          <DialogDescription>
            Configure as ações de fechamento do negócio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Deal info */}
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3">
              {deal.unit ? (
                <Home className="h-5 w-5 text-green-600" />
              ) : (
                <Building2 className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  {deal.lead.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deal.property.name}{deal.unit ? ` - Unid. ${deal.unit.unit_number}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Action 1: Update Property Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="update-status" className="font-medium">
                  Atualizar Status do Imóvel
                </Label>
              </div>
              <Switch
                id="update-status"
                checked={shouldUpdatePropertyStatus}
                onCheckedChange={setShouldUpdatePropertyStatus}
                disabled={!deal.unit?.id}
              />
            </div>
            {shouldUpdatePropertyStatus && deal.unit?.id && (
              <p className="text-sm text-muted-foreground pl-6">
                O imóvel será marcado como <strong className="text-green-600">{statusLabel}</strong> e 
                removido da disponibilidade do sistema.
              </p>
            )}
            {!deal.unit?.id && (
              <p className="text-sm text-amber-600 pl-6">
                Nenhuma unidade vinculada a este deal.
              </p>
            )}
          </div>

          <Separator />

          {/* Action 2: Create Financial Transaction */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="create-transaction" className="font-medium">
                  Lançar Comissão no Financeiro
                </Label>
              </div>
              <Switch
                id="create-transaction"
                checked={shouldCreateTransaction}
                onCheckedChange={setShouldCreateTransaction}
              />
            </div>

            {shouldCreateTransaction && (
              <div className="space-y-4 pl-6 animate-fade-in">
                {/* Sale Value */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <DollarSign className="h-3 w-3" />
                    Valor da {businessType === 'rental' ? 'Locação' : 'Venda'}
                  </Label>
                  <Input
                    type="number"
                    value={saleValue || ''}
                    onChange={(e) => setSaleValue(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>

                {/* Commission Rate */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
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
                  <Label className="flex items-center gap-1 text-sm">
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
                      <span className="font-bold text-primary text-lg">
                        R$ {commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action 3: Create Lease Contract (Rental only) */}
          {canCreateLease && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="create-lease" className="font-medium">
                      Criar Contrato de Locação
                    </Label>
                  </div>
                  <Switch
                    id="create-lease"
                    checked={shouldCreateLease}
                    onCheckedChange={setShouldCreateLease}
                  />
                </div>
                {shouldCreateLease && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 animate-fade-in">
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      <p className="text-muted-foreground">
                        Você será redirecionado para o módulo de <strong className="text-blue-600">Gestão de Contratos</strong> com os dados do negócio já preenchidos.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto">
            Pular
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processando...' : 'Confirmar Fechamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
