import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, Trash2, ExternalLink, Loader2 } from 'lucide-react';
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

interface UnitDocument {
  id: string;
  title: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface UnitDocumentsProps {
  unitId: string;
  userId: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const UnitDocuments = ({ unitId, userId }: UnitDocumentsProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<UnitDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [deleteDoc, setDeleteDoc] = useState<UnitDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [unitId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_path, file_size, created_at')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar documentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ 
        title: 'Formato não suportado', 
        description: 'Formatos permitidos: PDF, DOCX, JPG, PNG, WEBP', 
        variant: 'destructive' 
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Erro', description: 'Arquivo muito grande. Máximo 20MB.', variant: 'destructive' });
      return;
    }

    const docTitle = title.trim() || file.name.replace(/\.[^/.]+$/, '');
    
    setUploading(true);
    try {
      const timestamp = Date.now();
      const filePath = `${userId}/${unitId}/documents/${timestamp}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('unit-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          unit_id: unitId,
          broker_id: userId,
          title: docTitle,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          document_type: 'property_doc',
        });

      if (dbError) throw dbError;

      toast({ title: 'Documento enviado!', description: 'O arquivo foi anexado com sucesso.' });
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocuments();
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: UnitDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('unit-media')
        .download(doc.file_path);

      if (error) throw error;

      // Extract original extension from file_path
      const extension = doc.file_path.split('.').pop() || 'pdf';
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: 'Erro no download', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('unit-media')
        .remove([deleteDoc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', deleteDoc.id);

      if (dbError) throw dbError;

      toast({ title: 'Documento excluído!', description: 'O arquivo foi removido com sucesso.' });
      setDeleteDoc(null);
      loadDocuments();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Adicionar Documento PDF</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Nome do documento (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Enviando...' : 'Upload Arquivo'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">PDF, DOCX ou Imagens • Máximo 20MB</p>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          <Label>Documentos Anexados</Label>
          <div className="grid gap-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="bg-muted/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(doc)}
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteDoc(doc)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteDoc?.title}"? Esta ação não pode ser desfeita.
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
