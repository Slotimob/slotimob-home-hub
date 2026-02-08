import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Download, Loader2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface PropertyDocument {
  id: string;
  title: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface PropertyDocumentsProps {
  propertyId: string;
  userId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PropertyDocuments = ({ propertyId, userId }: PropertyDocumentsProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [propertyId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar documentos', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: 'Erro', description: 'Apenas arquivos PDF são permitidos.', variant: 'destructive' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Erro', description: 'Arquivo muito grande. Máximo 10MB.', variant: 'destructive' });
      return;
    }

    const docTitle = title.trim() || file.name.replace('.pdf', '');
    
    setUploading(true);
    try {
      const timestamp = Date.now();
      const filePath = `${userId}/${propertyId}/${timestamp}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('property-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          broker_id: userId,
          title: docTitle,
          file_path: filePath,
          file_size: file.size,
          mime_type: 'application/pdf',
        });

      if (dbError) throw dbError;

      toast({ title: 'Documento enviado!', description: 'O PDF foi anexado com sucesso.' });
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocuments();
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    const doc = documents.find(d => d.id === deleteId);
    if (!doc) return;

    try {
      // Delete from storage
      await supabase.storage.from('property-media').remove([doc.file_path]);
      
      // Delete from database
      const { error } = await supabase
        .from('property_documents')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({ title: 'Documento excluído!', description: 'O arquivo foi removido.' });
      loadDocuments();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('property-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
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
            accept="application/pdf"
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
            {uploading ? 'Enviando...' : 'Upload PDF'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Máximo 10MB por arquivo</p>
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
                      asChild
                    >
                      <a href={getDownloadUrl(doc.file_path)} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                    >
                      <a href={getDownloadUrl(doc.file_path)} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(doc.id)}
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
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum documento anexado</p>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O documento será removido permanentemente.
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
