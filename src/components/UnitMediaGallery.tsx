import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { compressImage, validateImageFile, formatFileSize } from '@/utils/imageOptimizer';
import { cn } from '@/lib/utils';

interface MediaFile {
  name: string;
  url: string;
  type: 'image' | 'video';
  fullPath: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: 'compressing' | 'uploading' | 'done';
}

interface UnitMediaGalleryProps {
  unitId: string;
}

export const UnitMediaGallery = ({ unitId }: UnitMediaGalleryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [deleteFile, setDeleteFile] = useState<MediaFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadMedia();
  }, [unitId]);

  const loadMedia = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('unit-media')
        .list(`${user?.id}/${unitId}`, {
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const files: MediaFile[] = data.map((file) => {
        const fullPath = `${user?.id}/${unitId}/${file.name}`;
        const { data: urlData } = supabase.storage
          .from('unit-media')
          .getPublicUrl(fullPath);

        const extension = file.name.split('.').pop()?.toLowerCase();
        const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension || '');

        return {
          name: file.name,
          url: urlData.publicUrl,
          type: isVideo ? 'video' : 'image',
          fullPath,
        };
      });

      setMedia(files);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar mídia',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processAndUploadFile = async (file: File): Promise<void> => {
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to uploading state
    setUploadingFiles(prev => [...prev, { id: uploadId, name: file.name, progress: 'compressing' }]);

    try {
      let fileToUpload = file;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        toast({
          title: 'Tipo de arquivo inválido',
          description: `${file.name} não é uma imagem ou vídeo válido.`,
          variant: 'destructive',
        });
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        return;
      }

      // Compress images
      if (isImage) {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast({
            title: 'Arquivo inválido',
            description: validationError,
            variant: 'destructive',
          });
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
          return;
        }

        try {
          const result = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8,
            format: 'image/jpeg',
          });
          
          fileToUpload = result.file;
          
          if (result.compressionRatio > 0) {
            console.log(`Compressed ${file.name}: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)} (${result.compressionRatio}% reduction)`);
          }
        } catch (compressError) {
          console.error('Compression error:', compressError);
          // Continue with original file if compression fails
        }
      }

      // Validate video size
      if (isVideo && file.size > 20 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: `${file.name} excede o limite de 20MB para vídeos.`,
          variant: 'destructive',
        });
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        return;
      }

      // Update progress to uploading
      setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress: 'uploading' as const } : f));

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id}/${unitId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('unit-media')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('unit-media')
        .getPublicUrl(filePath);

      // Add to media immediately
      const newMedia: MediaFile = {
        name: fileName,
        url: urlData.publicUrl,
        type: isVideo ? 'video' : 'image',
        fullPath: filePath,
      };

      setMedia(prev => [newMedia, ...prev]);
      
      toast({
        title: 'Imagem salva!',
        description: isImage 
          ? `Foto otimizada e enviada com sucesso.`
          : 'Vídeo enviado com sucesso.',
      });

    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process all files in parallel
    await Promise.all(Array.from(files).map(processAndUploadFile));
    
    e.target.value = '';
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    await Promise.all(Array.from(files).map(processAndUploadFile));
  }, [user, unitId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDelete = async () => {
    if (!deleteFile) return;

    try {
      const { error } = await supabase.storage
        .from('unit-media')
        .remove([deleteFile.fullPath]);

      if (error) throw error;

      // Remove from state immediately
      setMedia(prev => prev.filter(m => m.fullPath !== deleteFile.fullPath));

      toast({
        title: 'Mídia removida!',
        description: 'O arquivo foi excluído com sucesso.',
      });

      setDeleteFile(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover mídia',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Fotos e Vídeos</h3>
        <label>
          <Button variant="outline" size="sm" disabled={uploadingFiles.length > 0} asChild>
            <span className="cursor-pointer">
              {uploadingFiles.length > 0 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </span>
          </Button>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploadingFiles.length > 0}
          />
        </label>
      </div>

      {media.length === 0 && uploadingFiles.length === 0 ? (
        <Card 
          className={cn(
            "border-dashed transition-colors",
            isDragging && "border-primary bg-primary/5"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              {isDragging ? 'Solte para enviar' : 'Arraste fotos ou vídeos aqui'}
            </p>
            <label>
              <Button variant="outline" asChild>
                <span className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Adicionar Mídia
                </span>
              </Button>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-3">
              Imagens: até 25MB (otimizadas automaticamente) • Vídeos: até 20MB
            </p>
          </CardContent>
        </Card>
      ) : (
        <div 
          className={cn(
            "grid grid-cols-2 sm:grid-cols-3 gap-4 p-2 rounded-lg transition-colors",
            isDragging && "bg-primary/5 ring-2 ring-primary ring-dashed"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Uploading placeholders */}
          {uploadingFiles.map((file) => (
            <Card key={file.id} className="relative overflow-hidden">
              <CardContent className="p-0">
                <div className="w-full h-40 flex flex-col items-center justify-center bg-muted/50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground text-center px-2 truncate max-w-full">
                    {file.progress === 'compressing' ? 'Otimizando...' : 'Enviando...'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 truncate max-w-full px-2">
                    {file.name}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Existing media */}
          {media.map((file) => (
            <Card key={file.name} className="relative group overflow-hidden">
              <CardContent className="p-0">
                {file.type === 'image' ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative w-full h-40 bg-muted flex items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground" />
                    <video
                      src={file.url}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteFile(file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta mídia? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
