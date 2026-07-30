import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { normalizePropertyImageUrl } from '@/lib/imageUtils';

interface ImageLightboxProps {
  src: string | null | undefined;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ src, alt = 'Imagem', open, onOpenChange }: ImageLightboxProps) {
  const normalized = normalizePropertyImageUrl(src);
  if (!normalized) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-2 sm:p-4">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <img
          src={normalized}
          alt={alt}
          className="w-full max-h-[80vh] object-contain rounded-md"
        />
      </DialogContent>
    </Dialog>
  );
}
