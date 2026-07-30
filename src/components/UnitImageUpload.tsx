import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { normalizePropertyImageUrl } from '@/lib/imageUtils';
import { ImageLightbox } from '@/components/shared/ImageLightbox';

interface UnitImageUploadProps {
  unitId?: string;
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  autoSave?: boolean;
  onRefresh?: () => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_RESOLUTION = 300; // Minimum width/height in pixels
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export const UnitImageUpload = ({
  unitId,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  autoSave = false,
  onRefresh,
}: UnitImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  // Sync preview with currentImageUrl when it changes externally
  useEffect(() => {
    const normalizedCurrent = normalizePropertyImageUrl(currentImageUrl);
    if (normalizedCurrent) {
      // Add cache-busting for external URL changes
      const url = normalizedCurrent.includes('?')
        ? normalizedCurrent
        : `${normalizedCurrent}?t=${Date.now()}`;
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [currentImageUrl]);

  // Auto-save to database
  const saveToDatabase = useCallback(async (imageUrl: string | null): Promise<boolean> => {
    if (!autoSave || !unitId || isSavingRef.current) return true;
    
    isSavingRef.current = true;
    try {
      const { error } = await supabase
        .from('units')
        .update({ cover_image_url: imageUrl })
        .eq('id', unitId);

      if (error) throw error;
      
      // Force refresh parent data after successful save
      if (onRefresh) {
        await onRefresh();
      }
      
      return true;
    } catch (error: any) {
      console.error('Error auto-saving image:', error);
      toast({
        title: 'Erro ao salvar imagem',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [autoSave, unitId, onRefresh, toast]);

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check file type
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        toast({
          title: 'Formato inválido',
          description: 'Use apenas JPG, PNG ou WebP.',
          variant: 'destructive',
        });
        resolve(false);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O tamanho máximo é 5MB.',
          variant: 'destructive',
        });
        resolve(false);
        return;
      }

      // Check resolution
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width < MIN_RESOLUTION || img.height < MIN_RESOLUTION) {
          toast({
            title: 'Resolução muito baixa',
            description: `A imagem deve ter pelo menos ${MIN_RESOLUTION}x${MIN_RESOLUTION} pixels.`,
            variant: 'destructive',
          });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        toast({
          title: 'Erro ao processar imagem',
          description: 'Não foi possível ler a imagem. Tente outro arquivo.',
          variant: 'destructive',
        });
        resolve(false);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValid = await validateImage(file);
    if (!isValid) {
      e.target.value = '';
      return;
    }

    // Show preview immediately using FileReader
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      
      // Use temp folder if no unitId yet (for creation), or unit folder if editing
      const folder = unitId ? `${user?.id}/${unitId}` : `${user?.id}/temp`;
      const fileName = `cover-${timestamp}-${random}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('unit-media')
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('unit-media')
        .getPublicUrl(filePath);

      // Save to database first if autoSave is enabled
      const saved = await saveToDatabase(urlData.publicUrl);
      
      if (saved) {
        // Add cache-busting timestamp
        const urlWithTimestamp = `${urlData.publicUrl}?t=${timestamp}`;
        
        onImageUploaded(urlData.publicUrl);
        setPreview(urlWithTimestamp);

        toast({
          title: 'Imagem enviada!',
          description: 'A imagem de capa foi atualizada.',
        });
      } else {
        // Revert preview on save failure
        setPreview(currentImageUrl ? `${currentImageUrl}?t=${Date.now()}` : null);
      }
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
      // Revert to previous image on error
      setPreview(currentImageUrl ? `${currentImageUrl}?t=${Date.now()}` : null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (removing || uploading) return;
    
    setRemoving(true);
    
    try {
      // Try to delete from storage
      if (currentImageUrl) {
        try {
          const urlParts = currentImageUrl.split('/unit-media/');
          if (urlParts[1]) {
            // Remove query string if present
            const path = urlParts[1].split('?')[0];
            await supabase.storage.from('unit-media').remove([path]);
          }
        } catch (storageError) {
          console.error('Error deleting from storage:', storageError);
          // Continue even if storage delete fails
        }
      }
      
      // Save null to database if autoSave is enabled
      const saved = await saveToDatabase(null);
      
      if (saved) {
        setPreview(null);
        onImageRemoved?.();
        
        toast({
          title: 'Imagem removida',
          description: 'A imagem foi excluída com sucesso.',
        });
      }
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast({
        title: 'Erro ao remover imagem',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isLoading = uploading || removing;

  return (
    <div className="space-y-2">
      <Label>Imagem de Capa</Label>
      
      {preview ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <img
              src={preview}
              alt="Preview da unidade"
              className="w-full h-48 object-cover cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              key={preview} // Force re-render when URL changes
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemove}
                disabled={isLoading}
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            {isLoading ? (
              <>
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'Enviando...' : 'Removendo...'}
                </p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Clique para adicionar uma imagem
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou WebP • Máx. 5MB • Mín. 300x300px
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isLoading}
      />
    </div>
  );
};
