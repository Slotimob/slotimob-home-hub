import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/notifications';
import { normalizePropertyImageUrl } from '@/lib/imageUtils';
import { ImageLightbox } from '@/components/shared/ImageLightbox';

interface AssetImageUploadProps {
  /** Current image URL */
  currentImageUrl?: string | null;
  /** Callback when image is uploaded */
  onImageUploaded: (url: string) => void;
  /** Callback when image is removed */
  onImageRemoved?: () => void;
  /** Type of asset for storage bucket selection */
  assetType: 'unit' | 'property';
  /** Asset ID for folder organization (optional for new assets) */
  assetId?: string;
  /** Label for the field */
  label?: string;
  /** Whether to auto-save to database */
  autoSave?: boolean;
  /** Callback to refresh parent data after save */
  onRefresh?: () => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_RESOLUTION = 300;
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

const BUCKET_MAP = {
  unit: 'unit-media',
  property: 'property-media',
} as const;

const TABLE_MAP = {
  unit: { table: 'units', column: 'cover_image_url' },
  property: { table: 'properties', column: 'image_url' },
} as const;

/**
 * Unified image upload component for all asset types (units, properties).
 * Provides consistent UX across the application.
 */
export function AssetImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  assetType,
  assetId,
  label = 'Imagem de Capa',
  autoSave = false,
  onRefresh,
}: AssetImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  const bucket = BUCKET_MAP[assetType];
  const tableConfig = TABLE_MAP[assetType];

  // Sync preview with currentImageUrl
  useEffect(() => {
    const normalizedCurrent = normalizePropertyImageUrl(currentImageUrl);
    if (normalizedCurrent) {
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
    if (!autoSave || !assetId || isSavingRef.current) return true;

    isSavingRef.current = true;
    try {
      const { error } = await supabase
        .from(tableConfig.table as 'units' | 'properties')
        .update({ [tableConfig.column]: imageUrl })
        .eq('id', assetId);

      if (error) throw error;

      if (onRefresh) {
        await onRefresh();
      }

      return true;
    } catch (error: any) {
      console.error('Error auto-saving image:', error);
      showError('Erro ao salvar imagem', error.message);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [autoSave, assetId, tableConfig, onRefresh]);

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        showError('Formato inválido', 'Use apenas JPG, PNG ou WebP.');
        resolve(false);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        showError('Arquivo muito grande', 'O tamanho máximo é 5MB.');
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width < MIN_RESOLUTION || img.height < MIN_RESOLUTION) {
          showError('Resolução muito baixa', `A imagem deve ter pelo menos ${MIN_RESOLUTION}x${MIN_RESOLUTION} pixels.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        showError('Erro ao processar imagem', 'Não foi possível ler a imagem. Tente outro arquivo.');
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

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);

      const folder = assetId ? `${user?.id}/${assetId}` : `${user?.id}/temp`;
      const fileName = `cover-${timestamp}-${random}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const saved = await saveToDatabase(urlData.publicUrl);

      if (saved) {
        const urlWithTimestamp = `${urlData.publicUrl}?t=${timestamp}`;
        onImageUploaded(urlData.publicUrl);
        setPreview(urlWithTimestamp);
        showSuccess('Imagem enviada!', 'A imagem foi atualizada com sucesso.');
      } else {
        setPreview(currentImageUrl ? `${currentImageUrl}?t=${Date.now()}` : null);
      }
    } catch (error: any) {
      showError('Erro no upload', error.message);
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
      if (currentImageUrl) {
        try {
          const urlParts = currentImageUrl.split(`/${bucket}/`);
          if (urlParts[1]) {
            const path = urlParts[1].split('?')[0];
            await supabase.storage.from(bucket).remove([path]);
          }
        } catch (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      const saved = await saveToDatabase(null);

      if (saved) {
        setPreview(null);
        onImageRemoved?.();
        showSuccess('Imagem removida', 'A imagem foi excluída com sucesso.');
      }
    } catch (error: any) {
      console.error('Error removing image:', error);
      showError('Erro ao remover imagem', error.message);
    } finally {
      setRemoving(false);
    }
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isLoading = uploading || removing;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {preview ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              key={preview}
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

      <ImageLightbox
        src={preview}
        alt="Imagem do imóvel"
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}
