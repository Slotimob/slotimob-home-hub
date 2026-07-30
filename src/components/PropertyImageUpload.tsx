import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { normalizePropertyImageUrl } from '@/lib/imageUtils';
import { ImageLightbox } from '@/components/shared/ImageLightbox';

interface PropertyImageUploadProps {
  propertyId?: string;
  currentImageUrl: string | null;
  onImageChange: (url: string | null) => void;
  userId: string;
  autoSave?: boolean;
  onRefresh?: () => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PropertyImageUpload = ({ 
  propertyId, 
  currentImageUrl, 
  onImageChange,
  userId,
  autoSave = false,
  onRefresh,
}: PropertyImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(normalizePropertyImageUrl(currentImageUrl));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  // Sync preview with currentImageUrl when it changes externally
  useEffect(() => {
    // Add cache-busting for external URL changes
    if (currentImageUrl) {
      const url = currentImageUrl.includes('?') 
        ? currentImageUrl 
        : `${currentImageUrl}?t=${Date.now()}`;
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [currentImageUrl]);

  // Auto-save to database
  const saveToDatabase = useCallback(async (imageUrl: string | null): Promise<boolean> => {
    if (!autoSave || !propertyId || isSavingRef.current) return true;
    
    isSavingRef.current = true;
    try {
      const { error } = await supabase
        .from('properties')
        .update({ image_url: imageUrl })
        .eq('id', propertyId);

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
  }, [autoSave, propertyId, onRefresh, toast]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Formato inválido. Use JPG, PNG ou WebP.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande. Máximo 5MB.';
    }
    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast({ title: 'Erro', description: error, variant: 'destructive' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Show preview immediately using FileReader
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to storage
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filePath = `${userId}/${propertyId || 'new'}/${timestamp}-${random}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('property-media')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-media')
        .getPublicUrl(filePath);

      // Save to database first if autoSave is enabled
      const saved = await saveToDatabase(publicUrl);
      
      if (saved) {
        // Add cache-busting timestamp to force browser refresh
        const urlWithTimestamp = `${publicUrl}?t=${timestamp}`;
        
        onImageChange(publicUrl);
        setPreview(urlWithTimestamp);
        
        toast({ 
          title: 'Imagem carregada!', 
          description: 'A imagem foi enviada e salva com sucesso.' 
        });
      } else {
        // Revert preview on save failure
        setPreview(currentImageUrl ? `${currentImageUrl}?t=${Date.now()}` : null);
      }
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
      // Revert to previous image on error
      setPreview(currentImageUrl ? `${currentImageUrl}?t=${Date.now()}` : null);
    } finally {
      setUploading(false);
      // Reset file input to allow re-uploading same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (removing || uploading) return;
    
    setRemoving(true);
    
    try {
      // Try to delete from storage
      if (currentImageUrl) {
        try {
          const urlParts = currentImageUrl.split('/property-media/');
          if (urlParts[1]) {
            // Remove query string if present
            const path = urlParts[1].split('?')[0];
            await supabase.storage.from('property-media').remove([path]);
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
        onImageChange(null);
        
        toast({ 
          title: 'Imagem removida', 
          description: 'A imagem foi excluída com sucesso.' 
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isLoading = uploading || removing;

  return (
    <div className="space-y-2">
      <Label>Imagem do Empreendimento</Label>
      <div className="flex flex-col gap-3">
        {preview ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              key={preview} // Force re-render when URL changes
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
              disabled={isLoading}
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
            {uploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          <div 
            className="w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-muted/50"
            onClick={() => !isLoading && fileInputRef.current?.click()}
          >
            {isLoading ? (
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para adicionar imagem
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG ou WebP (máx. 5MB)
                </span>
              </>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />
        
        {!preview && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar Imagem
          </Button>
        )}
      </div>

      <ImageLightbox
        src={preview}
        alt="Imagem do imóvel"
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
};
