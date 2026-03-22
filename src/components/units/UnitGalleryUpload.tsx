import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage, validateImageFile, formatFileSize } from '@/utils/imageOptimizer';

interface UploadingImage {
  id: string;
  name: string;
  progress: 'compressing' | 'uploading';
}

interface UnitGalleryUploadProps {
  unitId: string;
  userId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  autoSave?: boolean;
  onRefresh?: () => Promise<void>;
  onComplete?: () => void;
}

export const UnitGalleryUpload = ({
  unitId,
  userId,
  images,
  onImagesChange,
  maxImages = 20,
  autoSave = true,
  onRefresh,
  onComplete,
}: UnitGalleryUploadProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const isSavingRef = useRef(false);

  const saveToDatabase = async (newImages: string[]): Promise<boolean> => {
    if (!autoSave || !unitId || isSavingRef.current) return true;
    
    isSavingRef.current = true;
    try {
      const { error } = await supabase
        .from('units')
        .update({ gallery_images: newImages } as any)
        .eq('id', unitId);

      if (error) throw error;
      
      if (onRefresh) {
        await onRefresh();
      }
      
      return true;
    } catch (error: any) {
      console.error('Error saving gallery:', error);
      toast({ title: 'Erro ao salvar galeria', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      isSavingRef.current = false;
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setUploadingImages(prev => [...prev, { id: uploadId, name: file.name, progress: 'compressing' }]);

    try {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast({ title: 'Arquivo inválido', description: validationError, variant: 'destructive' });
        setUploadingImages(prev => prev.filter(f => f.id !== uploadId));
        return null;
      }

      let fileToUpload = file;
      try {
        const result = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.8, format: 'image/jpeg' });
        fileToUpload = result.file;
        if (result.compressionRatio > 0) {
          console.log(`Compressed ${file.name}: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)} (${result.compressionRatio}% reduction)`);
        }
      } catch (compressError) {
        console.error('Compression error:', compressError);
      }

      setUploadingImages(prev => prev.map(f => f.id === uploadId ? { ...f, progress: 'uploading' as const } : f));

      const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${unitId}/gallery/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('unit-media')
        .upload(fileName, fileToUpload, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('unit-media')
        .getPublicUrl(fileName);

      setUploadingImages(prev => prev.filter(f => f.id !== uploadId));
      return publicUrl;
    } catch (error: any) {
      setUploadingImages(prev => prev.filter(f => f.id !== uploadId));
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const handleFilesSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = maxImages - images.length;
    
    if (fileArray.length > remaining) {
      toast({ title: 'Limite excedido', description: `Você pode adicionar no máximo ${remaining} imagem${remaining !== 1 ? 's' : ''}.`, variant: 'destructive' });
      return;
    }

    const uploadPromises = fileArray.slice(0, remaining).map(uploadImage);
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((url): url is string => url !== null);
    
    if (successfulUploads.length > 0) {
      const newImages = [...images, ...successfulUploads];
      const saved = await saveToDatabase(newImages);
      if (saved) {
        onImagesChange(newImages);
        toast({ title: 'Fotos salvas!', description: `${successfulUploads.length} imagem${successfulUploads.length !== 1 ? 's' : ''} otimizada${successfulUploads.length !== 1 ? 's' : ''} e salva${successfulUploads.length !== 1 ? 's' : ''} com sucesso.` });
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelect(e.dataTransfer.files);
  }, [images, maxImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const removeImage = async (index: number) => {
    if (isDeleting !== null) return;
    setIsDeleting(index);
    const imageUrl = images[index];
    const newImages = images.filter((_, i) => i !== index);

    // Optimistic update: immediately reflect in UI
    onImagesChange(newImages);

    try {
      try {
        const urlParts = imageUrl.split('/unit-media/');
        if (urlParts[1]) {
          const path = urlParts[1].split('?')[0];
          await supabase.storage.from('unit-media').remove([path]);
        }
      } catch (storageError) {
        console.error('Error deleting from storage:', storageError);
      }

      const saved = await saveToDatabase(newImages);
      if (saved) {
        // Force fresh data from server
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['units'] }),
          queryClient.invalidateQueries({ queryKey: ['unit'] }),
          queryClient.refetchQueries({ queryKey: ['units'] }),
        ]);
        toast({ title: 'Foto removida' });
      } else {
        // Rollback optimistic update
        onImagesChange(images);
        toast({ title: 'Erro ao remover foto', description: 'Não foi possível salvar a alteração.', variant: 'destructive' });
      }
    } catch (error: any) {
      // Rollback optimistic update
      onImagesChange(images);
      console.error('Error removing image:', error);
      toast({ title: 'Erro ao remover foto', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(null);
    }
  };

  const isUploading = uploadingImages.length > 0;

  return (
    <div className="space-y-3">
      <Label>Galeria de Fotos do Imóvel</Label>
      
      {(images.length > 0 || uploadingImages.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {uploadingImages.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mb-1" />
                <span className="text-[10px] text-muted-foreground">
                  {img.progress === 'compressing' ? 'Otimizando...' : 'Enviando...'}
                </span>
              </div>
            </div>
          ))}
          
          {images.map((url, index) => (
            <div 
              key={`${url}-${index}`} 
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              <img
                src={url.includes('?') ? url : `${url}?t=${Date.now()}`}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={isDeleting !== null}
                className={cn(
                  "absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full transition-opacity",
                  isDeleting === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                {isDeleting === index ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Otimizando e enviando...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragging ? 'Solte para enviar' : 'Arraste fotos do imóvel ou'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/jpeg,image/png,image/webp';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFilesSelect(files);
                  };
                  input.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivos
              </Button>
              <p className="text-xs text-muted-foreground">
                {images.length}/{maxImages} fotos • JPG, PNG ou WebP até 25MB (otimizadas automaticamente)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save button — proper spacing, no sticky float */}
      {images.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <Button
            type="button"
            className="w-full"
            disabled={uploadingImages.length > 0 || isDeleting !== null}
            onClick={async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['units'] }),
                queryClient.invalidateQueries({ queryKey: ['unit'] }),
                queryClient.invalidateQueries({ queryKey: ['unit_images'] }),
                queryClient.refetchQueries({ queryKey: ['units'] }),
              ]);
              toast({ title: 'Galeria atualizada!' });
              onComplete?.();
            }}
          >
            Salvar e Atualizar Galeria
          </Button>
        </div>
      )}
    </div>
  );
};
