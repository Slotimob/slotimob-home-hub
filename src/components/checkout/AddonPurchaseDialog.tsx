import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAddonCheckout, type AddonId } from '@/hooks/useAddonCheckout';
import { PaymentMethodSelector, type PlatformBillingType } from './PaymentMethodSelector';
import { PlatformPaymentResult, type PlatformPaymentResultData } from './PlatformPaymentResult';

interface AddonPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addonId: AddonId;
  quantity: number;
  label: string;
  priceLabel?: string;
}

export function AddonPurchaseDialog({ open, onOpenChange, addonId, quantity, label, priceLabel }: AddonPurchaseDialogProps) {
  const { buyAddon, loadingAddonId } = useAddonCheckout();
  const [billingType, setBillingType] = useState<PlatformBillingType>('PIX');
  const [result, setResult] = useState<PlatformPaymentResultData | null>(null);
  const loading = loadingAddonId === addonId;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setResult(null);
      setBillingType('PIX');
    }
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    const res = await buyAddon(addonId, quantity, billingType);
    if (res) setResult(res);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="max-h-[80vh] overflow-y-auto space-y-4">
          <DialogHeader>
            <DialogTitle>Contratar {label}</DialogTitle>
            {priceLabel && (
              <DialogDescription>
                {quantity}× {label} · {priceLabel}
              </DialogDescription>
            )}
          </DialogHeader>

          {result ? (
            <>
              <PlatformPaymentResult result={result} billingType={billingType} />
              <p className="text-sm text-muted-foreground">O add-on é liberado assim que o pagamento for confirmado.</p>
              <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </>
          ) : (
            <>
              <PaymentMethodSelector value={billingType} onChange={setBillingType} disabled={loading} />
              <p className="text-xs text-muted-foreground">
                A 1ª cobrança vence hoje e renova todo mês no mesmo dia. Cada add-on tem sua própria cobrança.
              </p>
              <Button className="w-full" onClick={handleGenerate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Gerar cobrança
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddonPurchaseDialog;
