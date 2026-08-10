import { useState, useRef, useEffect } from 'react';
import { sanitizeStorageFileName } from '@/lib/utils';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Download, Loader2, Eye, Link2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import DOMPurify from 'dompurify';

interface PropertyDocument {
  id: string;
  title: string;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
  source_type: string;
  external_url: string | null;
  external_provider: string | null;
}

interface PropertyDocumentsProps {
  propertyId: string;
  userId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DANGEROUS_SCHEMES = /^(javascript|data|file|vbscript|blob):/i;

function isValidHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  const sanitized = DOMPurify.sanitize(trimmed);
  if (!isValidHttpUrl(sanitized)) return '';
  return sanitized;
}

function detectProvider(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) return 'google_drive';
    if (hostname.includes('1drv.ms') || hostname.includes('onedrive.live.com') || hostname.includes('sharepoint.com')) return 'onedrive';
    if (hostname.includes('dropbox.com')) return 'dropbox';
    return 'other';
  } catch {
    return 'other';
  }
}

function providerLabel(provider: string | null): string {
  switch (provider) {
    case 'google_drive': return 'Google Drive';
    case 'onedrive': return 'OneDrive';
    case 'dropbox': return 'Dropbox';
    default: return 'Link externo';
  }
}

export const PropertyDocuments = ({ propertyId, userId }: PropertyDocumentsProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // External link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [propertyId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('property_documents')
        .select('id, title, file_path, file_size, created_at, source_type, external_url, external_provider')
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

  // ─── Upload flow (unchanged logic) ───
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
        .from('property-documents')
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
          source_type: 'upload',
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

  // ─── External link flow ───
  const handleSaveLink = async () => {
    const trimmedTitle = linkTitle.trim();
    const trimmedUrl = linkUrl.trim();

    if (!trimmedTitle) {
      toast({ title: 'Erro', description: 'Informe um título para o documento.', variant: 'destructive' });
      return;
    }

    if (DANGEROUS_SCHEMES.test(trimmedUrl)) {
      toast({ title: 'Erro', description: 'Esse tipo de link não é permitido por segurança.', variant: 'destructive' });
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      toast({ title: 'Erro', description: 'Informe uma URL válida começando com http:// ou https://.', variant: 'destructive' });
      return;
    }

    const safe = sanitizeUrl(trimmedUrl);
    if (!safe) {
      toast({ title: 'Erro', description: 'Esse tipo de link não é permitido por segurança.', variant: 'destructive' });
      return;
    }

    setSavingLink(true);
    try {
      const provider = detectProvider(safe);

      const { error } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          broker_id: userId,
          title: trimmedTitle,
          source_type: 'external_link',
          external_url: safe,
          external_provider: provider,
          file_path: null,
          file_size: null,
          mime_type: null,
        });

      if (error) throw error;

      toast({ title: 'Link vinculado!', description: 'O documento externo foi adicionado com sucesso.' });
      setLinkDialogOpen(false);
      setLinkTitle('');
      setLinkUrl('');
      loadDocuments();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar link', description: err.message, variant: 'destructive' });
    } finally {
      setSavingLink(false);
    }
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!deleteId) return;

    const doc = documents.find(d => d.id === deleteId);
    if (!doc) return;

    try {
      // Only remove from Storage if it's an upload with a valid file_path.
      // External links have no file in Storage.
      if (doc.source_type === 'upload' && doc.file_path) {
        const { error: storageError } = await supabase
          .storage
          .from('property-documents')
          .remove([doc.file_path]);

        if (storageError) {
          // Don't block the flow — just log. Orphan files are less critical
          // than leaving the DB row dangling.
          console.warn('Falha ao remover arquivo do Storage:', storageError);
        }
      }

      const { error } = await supabase
        .from('property_documents')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'Documento excluído!',
        description: doc.source_type === 'external_link'
          ? 'O link foi removido.'
          : 'O arquivo foi removido.',
      });
      loadDocuments();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('property-documents')
      .createSignedUrl(filePath, 60 * 60); // 1 hora

    if (error) {
      console.error('Erro ao gerar signed URL do documento:', error);
      toast({
        title: 'Erro ao gerar link',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }

    return data.signedUrl;
  };

  const openDocument = async (filePath: string, download = false) => {
    const url = await getDownloadUrl(filePath);
    if (!url) return;
    if (download) {
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
      {/* Upload + Link buttons */}
      <div className="space-y-3">
        <Label>Adicionar Documento</Label>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLinkDialogOpen(true)}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Anexar link
                </Button>
              </TooltipTrigger>
              <TooltipContent>Vincular documento por URL externa</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-muted-foreground">Upload: máximo 10MB por arquivo (PDF) • Links: Google Drive, OneDrive, Dropbox, etc.</p>
      </div>

      {/* Document list */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          <Label>Documentos Anexados</Label>
          <div className="grid gap-2">
            {documents.map((doc) => {
              const isExternal = doc.source_type === 'external_link';
              const safeExternalUrl = isExternal && doc.external_url ? sanitizeUrl(doc.external_url) : '';

              return (
                <Card key={doc.id} className="bg-muted/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    {isExternal ? (
                      <ExternalLink className="h-8 w-8 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{doc.title}</p>
                        {isExternal && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                            {providerLabel(doc.external_provider)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {!isExternal && doc.file_size ? `${formatFileSize(doc.file_size)} • ` : ''}
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {isExternal ? (
                        safeExternalUrl && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(safeExternalUrl, '_blank', 'noopener,noreferrer')}
                            title="Abrir"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )
                      ) : (
                        <>
                          {doc.file_path && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDocument(doc.file_path!, false)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {doc.file_path && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDocument(doc.file_path!, true)}
                              title="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Excluir documento ${doc.title}`}
                        onClick={() => setDeleteId(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum documento anexado</p>
        </div>
      )}

      {/* External link dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular documento externo</DialogTitle>
            <DialogDescription>
              Cole um link do Google Drive, OneDrive, Dropbox, etc. Confira se o link está com permissão de acesso adequada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="link-title">Título *</Label>
              <Input
                id="link-title"
                placeholder="Ex: Contrato de locação"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                placeholder="https://drive.google.com/..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLink} disabled={savingLink}>
              {savingLink && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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
              type="button"
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
