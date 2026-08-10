import { useState, useRef, useEffect } from 'react';
import { sanitizeStorageFileName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, Trash2, ExternalLink, Loader2, Link2, Eye } from 'lucide-react';
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

interface AssetDocument {
  id: string;
  title: string;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
  source_type: string;
  external_url: string | null;
  external_provider: string | null;
}

interface AssetDocumentsProps {
  assetType: 'unit' | 'property';
  assetId: string;
  userId: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];

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

export const AssetDocuments = ({ assetType, assetId, userId }: AssetDocumentsProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [deleteDoc, setDeleteDoc] = useState<AssetDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const idColumn = assetType === 'unit' ? 'unit_id' : 'property_id';
  const documentType = assetType === 'unit' ? 'unit_doc' : 'property_doc';

  useEffect(() => {
    loadDocuments();
  }, [assetId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_path, file_size, created_at, source_type, external_url, external_provider')
        .eq(idColumn, assetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar documentos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Formato não suportado',
        description: 'Formatos permitidos: PDF, DOCX, JPG, PNG, WEBP',
        variant: 'destructive',
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
      const filePath = `${userId}/${assetId}/documents/${timestamp}-${sanitizeStorageFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          [idColumn]: assetId,
          broker_id: userId,
          title: docTitle,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          document_type: documentType,
          source_type: 'upload',
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
        .from('documents')
        .insert({
          [idColumn]: assetId,
          broker_id: userId,
          title: trimmedTitle,
          source_type: 'external_link',
          external_url: safe,
          external_provider: provider,
          file_path: null,
          file_size: null,
          mime_type: null,
          document_type: documentType,
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

  const handleDelete = async () => {
    if (!deleteDoc) return;

    try {
      if (deleteDoc.source_type === 'upload' && deleteDoc.file_path) {
        await supabase.storage.from('documents').remove([deleteDoc.file_path]);
      }

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

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60 * 60); // 1 hora

    if (error) {
      toast({ title: 'Erro ao gerar link', description: 'Tente novamente.', variant: 'destructive' });
      return null;
    }

    return data.signedUrl;
  };

  const openDocument = async (doc: AssetDocument, download: boolean) => {
    if (!doc.file_path) return;
    const url = await getSignedUrl(doc.file_path);
    if (!url) return;

    if (download) {
      const extension = doc.file_path.split('.').pop() || 'pdf';
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.${extension}`;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
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
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? 'Enviando...' : 'Upload Arquivo'}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(true)}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Anexar link
                </Button>
              </TooltipTrigger>
              <TooltipContent>Vincular documento por URL externa</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-muted-foreground">Upload: PDF, DOCX ou Imagens • Máximo 20MB • Links: Google Drive, OneDrive, Dropbox, etc.</p>
      </div>

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
                          <Button size="icon" variant="ghost" onClick={() => window.open(safeExternalUrl, '_blank', 'noopener,noreferrer')} title="Abrir">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => openDocument(doc, false)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openDocument(doc, true)} title="Baixar">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
              );
            })}
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
              <Label htmlFor="asset-link-title">Título *</Label>
              <Input id="asset-link-title" placeholder="Ex: Contrato de locação" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-link-url">URL *</Label>
              <Input id="asset-link-url" placeholder="https://drive.google.com/..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveLink} disabled={savingLink}>
              {savingLink && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
