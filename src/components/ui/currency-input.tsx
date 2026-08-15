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
 * The decimal separator is the LAST "." or "," in the string, provided it is
 * followed by exactly 1 or 2 digits. Every separator before it is a thousand
 * separator and is removed. Works for "1.500,50", "1500.50" and "1500,50".
 */
export const parseInputValue = (displayValue: string): string => {
  if (!displayValue) return '';

  const sanitized = displayValue.replace(/[^\d.,]/g, '');
  if (!sanitized) return '';

  const lastSepIndex = Math.max(sanitized.lastIndexOf('.'), sanitized.lastIndexOf(','));
  let cleaned: string;

  if (lastSepIndex === -1) {
    cleaned = sanitized;
  } else {
    const decimals = sanitized.slice(lastSepIndex + 1);
    const isDecimalSeparator = /^\d{1,2}$/.test(decimals);
    if (isDecimalSeparator) {
      const intPart = sanitized.slice(0, lastSepIndex).replace(/[.,]/g, '');
      cleaned = `${intPart}.${decimals}`;
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

export { CurrencyInput };
