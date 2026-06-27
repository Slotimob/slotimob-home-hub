/**
 * SLOTI brand symbol — uses the official logo asset.
 */
import slotiSymbolAsset from '@/assets/sloti-symbol.png.asset.json';

interface SlotiSymbolProps {
  size?: number;
  className?: string;
  title?: string;
}

export function SlotiSymbol({ size = 28, className = '', title = 'Sloti' }: SlotiSymbolProps) {
  return (
    <img
      src={slotiSymbolAsset.url}
      alt={title}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
