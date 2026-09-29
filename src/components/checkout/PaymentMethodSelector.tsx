import { cn } from '@/lib/utils';

export type PlatformBillingType = 'PIX' | 'CREDIT_CARD';

interface PaymentMethodSelectorProps {
  value: PlatformBillingType;
  onChange: (value: PlatformBillingType) => void;
  disabled?: boolean;
}

const OPTIONS: { value: PlatformBillingType; label: string; subtitle: string }[] = [
  { value: 'PIX', label: 'PIX', subtitle: 'aprovação na hora' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito', subtitle: 'ambiente seguro do Asaas' },
];

export function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'py-2 px-3 rounded-lg border text-sm font-medium transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50',
            )}
          >
            <span className="block">{opt.label}</span>
            <span className="block text-xs font-normal opacity-80">{opt.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}

export default PaymentMethodSelector;
