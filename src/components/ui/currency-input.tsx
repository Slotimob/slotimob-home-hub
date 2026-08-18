import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  /** Currency symbol to display */
  currency?: string;
  /** Locale for formatting */
  locale?: string;
}

/**
 * Formats a numeric string with thousand separators for display
 */
const formatDisplayValue = (value: string, locale: string = 'pt-BR'): string => {
  if (!value || value === '') return '';

  const parsed = parseFloat(parseInputValue(String(value)));
  if (isNaN(parsed)) return '';

  const hasDecimals = !Number.isInteger(parsed);

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(parsed);
};


/**
 * Parses a formatted display value back to a raw numeric string.
 *
 * Rules:
 * - If both "." and "," are present, the LAST one is the decimal separator and
 *   every earlier separator is a thousand separator ("1.500,50" -> 1500.50).
 * - A single "," is ALWAYS a decimal separator, with any number of decimals
 *   ("4,538" -> 4.538, "4,5" -> 4.5).
 * - A single "." is a decimal separator UNLESS the string looks like a
 *   thousand-grouped number ("1.500" / "1.500.000" -> 1500 / 1500000).
 *   When `allowThousandsGrouping` is false (e.g. percentages, where grouping
 *   never happens), a single "." is always decimal ("4.538" -> 4.538).
 */
export const parseInputValue = (
  displayValue: string,
  options?: { allowThousandsGrouping?: boolean }
): string => {
  if (!displayValue) return '';

  const allowThousandsGrouping = options?.allowThousandsGrouping ?? true;
  const sanitized = displayValue.replace(/[^\d.,]/g, '');
  if (!sanitized) return '';

  const lastDot = sanitized.lastIndexOf('.');
  const lastComma = sanitized.lastIndexOf(',');
  const lastSepIndex = Math.max(lastDot, lastComma);
  let cleaned: string;

  if (lastSepIndex === -1) {
    cleaned = sanitized;
  } else {
    const hasBoth = lastDot !== -1 && lastComma !== -1;
    const lastSepChar = sanitized[lastSepIndex];
    const decimals = sanitized.slice(lastSepIndex + 1);
    const hasDecimalDigits = /^\d+$/.test(decimals);

    // Dot-only strings that look like thousand grouping: 1.500 / 1.500.000
    const looksLikeGrouping =
      !hasBoth &&
      lastSepChar === '.' &&
      allowThousandsGrouping &&
      /^\d{1,3}(\.\d{3})+$/.test(sanitized);

    const isDecimalSeparator = hasDecimalDigits && !looksLikeGrouping;

    if (isDecimalSeparator) {
      const intPart = sanitized.slice(0, lastSepIndex).replace(/[.,]/g, '');
      cleaned = `${intPart || '0'}.${decimals}`;
    } else {
      cleaned = sanitized.replace(/[.,]/g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return '';

  return parsed.toString();
};



/**
 * Currency input component that displays formatted values (e.g., 2.000.000)
 * while storing raw numeric values internally
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, currency = 'R$', locale = 'pt-BR', ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Sync display value with external value changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatDisplayValue(value, locale));
      }
    }, [value, locale, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Allow only numbers, dots, and commas
      const sanitized = input.replace(/[^\d.,]/g, '');
      setDisplayValue(sanitized);
      
      // Parse to raw value for storage
      const rawValue = parseInputValue(sanitized);
      onChange(rawValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw value on focus for easier editing
      if (value) {
        // Convert internal value to locale format for editing
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setDisplayValue(numValue.toString().replace('.', ','));
        }
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Format on blur
      setDisplayValue(formatDisplayValue(value, locale));
      props.onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

interface PercentInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Numeric value (e.g. 10.5 for 10,5%) */
  value: number | string;
  onChange: (value: number) => void;
  /** Maximum allowed percentage (default 100) */
  max?: number;
}

/**
 * Percentage input: accepts "10,5" or "10.5" without losing decimals, caps at `max`.
 */
const PercentInput = React.forwardRef<HTMLInputElement, PercentInputProps>(
  ({ className, value, onChange, max = 100, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (!isFocused) {
        const num = typeof value === 'number'
        ? value
        : parseFloat(parseInputValue(String(value ?? ''), { allowThousandsGrouping: false }));
        setDisplayValue(isNaN(num) || value === '' || value === null || value === undefined
          ? ''
          : String(num).replace('.', ','));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = e.target.value.replace(/[^\d.,]/g, '');
      setDisplayValue(sanitized);
      const raw = parseInputValue(sanitized, { allowThousandsGrouping: false });
      const num = parseFloat(raw);
      if (isNaN(num)) {
        onChange(0);
        return;
      }
      onChange(Math.min(num, max));
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          className={cn('pr-8', className)}
          value={displayValue}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            const num = parseFloat(parseInputValue(displayValue, { allowThousandsGrouping: false }));
            setDisplayValue(isNaN(num) ? '' : String(Math.min(num, max)).replace('.', ','));
            props.onBlur?.(e);
          }}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          %
        </span>
      </div>
    );
  }
);

PercentInput.displayName = 'PercentInput';

export { CurrencyInput, PercentInput };

