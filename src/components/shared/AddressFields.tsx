import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCepSearch } from '@/hooks/useCepSearch';
import { Loader2 } from 'lucide-react';

export interface AddressData {
  postal_code: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface AddressFieldsProps {
  /** Current address data */
  data: AddressData;
  /** Callback when any field changes */
  onChange: (data: AddressData) => void;
  /** Whether to include neighborhood in the address field (for simpler forms) */
  includeNeighborhoodInAddress?: boolean;
  /** Whether all fields are disabled */
  disabled?: boolean;
  /** Layout variant - 'compact' for inline, 'full' for stacked */
  layout?: 'compact' | 'full';
  /** Whether to show neighborhood as separate field (default: true) */
  showNeighborhood?: boolean;
}

/**
 * Unified address fields component with CEP auto-complete.
 * Use this wherever you need address input - contacts, properties, units.
 */
export function AddressFields({
  data,
  onChange,
  includeNeighborhoodInAddress = false,
  disabled = false,
  layout = 'full',
  showNeighborhood = true,
}: AddressFieldsProps) {
  const { isLoadingCep, handleCepBlur, formatCep } = useCepSearch({ 
    includeNeighborhoodInAddress 
  });

  const handleChange = (field: keyof AddressData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleCepChange = (value: string) => {
    onChange({ ...data, postal_code: formatCep(value) });
  };

  const handleCepBlurEvent = () => {
    handleCepBlur(data.postal_code, (result) => {
      onChange({
        ...data,
        address: result.address || data.address,
        neighborhood: result.neighborhood || data.neighborhood,
        city: result.city || data.city,
        state: result.state || data.state,
      });
    });
  };

  if (layout === 'compact') {
    return (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="postal_code">CEP</Label>
          <div className="relative">
            <Input
              id="postal_code"
              value={data.postal_code}
              onChange={(e) => handleCepChange(e.target.value)}
              onBlur={handleCepBlurEvent}
              placeholder="00000-000"
              disabled={disabled || isLoadingCep}
            />
            {isLoadingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Cidade"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input
            id="state"
            value={data.state}
            onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
            placeholder="UF"
            maxLength={2}
            disabled={disabled}
          />
        </div>
        {showNeighborhood && (
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={data.neighborhood}
              onChange={(e) => handleChange('neighborhood', e.target.value)}
              placeholder="Bairro"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CEP with auto-complete */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">CEP</Label>
          <div className="relative">
            <Input
              id="postal_code"
              value={data.postal_code}
              onChange={(e) => handleCepChange(e.target.value)}
              onBlur={handleCepBlurEvent}
              placeholder="00000-000"
              disabled={disabled || isLoadingCep}
            />
            {isLoadingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        {showNeighborhood && (
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={data.neighborhood}
              onChange={(e) => handleChange('neighborhood', e.target.value)}
              placeholder="Bairro"
              disabled={disabled}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Cidade"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input
            id="state"
            value={data.state}
            onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
            placeholder="UF"
            maxLength={2}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Full address */}
      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          value={data.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Rua, número, complemento"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
