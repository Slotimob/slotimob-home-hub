import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { normalizePropertyImageUrl } from '@/lib/imageUtils';

interface PropertyImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function PropertyImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
}: PropertyImageProps) {
  const normalizedSrc = normalizePropertyImageUrl(src);
  const [hasError, setHasError] = useState(false);

  const showImage = normalizedSrc && !hasError;
  const containerClasses = `flex flex-col items-center justify-center bg-muted text-muted-foreground ${fallbackClassName || className}`;

  if (showImage) {
    return (
      <img
        src={normalizedSrc}
        alt={alt}
        className={className}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div className={containerClasses}>
      <ImageOff size={24} strokeWidth={1.5} />
      <span className="mt-1 text-xs text-muted-foreground">Sem imagem</span>
    </div>
  );
}
