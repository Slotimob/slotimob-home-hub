import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage, validateImageFile, formatFileSize } from '@/utils/imageOptimizer';

interface BlogImageUploadProps {
  value: string;
  altText: string;
  onChange: (url: string) => void;
  onAltTextChange: (alt: string) => void;
  label?: string;
}

export function BlogImageUpload({
  value,
  altText,
  onChange,
  onAltTextChange,
  label = 'Imagem Destacada',
}: BlogImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Step 1: Compress to WebP client-side
      setProgress(20);
      const result = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'image/webp',
      });

      setProgress(60);
      setCompressionInfo(
        `${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)} (${result.compressionRatio}% redução)`
      );

      // Step 2: Upload to Supabase Storage
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filePath = `${user.id}/blog/${timestamp}-${random}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, result.file, { upsert: true, contentType: 'image/webp' });

      setProgress(90);

      if (uploadError) {
        // Bucket may not exist – try creating it via a simple upload to trigger creation
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
      setProgress(100);
      toast.success('Imagem otimizada e enviada!');
    } catch (err: any) {
      console.error('Blog image upload error:', err);
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
      setTimeout(() => setProgress(0), 1500);
    }
  };

  const handleRemove = () => {
    onChange('');
    setCompressionInfo(null);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={value}
            alt={altText || 'Preview'}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button type="button" variant="secondary" size="icon" className="h-7 w-7"
              onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="destructive" size="icon" className="h-7 w-7"
              onClick={handleRemove} disabled={uploading}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading ? 'Otimizando e enviando...' : 'Clique para enviar (PNG/JPG até 25MB)'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Conversão automática para WebP • Máx. 1200px • 80% qualidade
          </p>
        </div>
      )}

      {(uploading || progress > 0) && (
        <Progress value={progress} className="h-2" />
      )}

      {compressionInfo && !uploading && (
        <p className="text-xs text-muted-foreground">{compressionInfo}</p>
      )}

      <div className="space-y-1">
        <Label className="text-xs">
          Texto Alternativo (alt) <span className="text-destructive">*</span>
        </Label>
        <Input
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          placeholder="Descreva a imagem para acessibilidade e SEO..."
          className="text-sm"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
}
