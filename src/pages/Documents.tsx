import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Search, Download, Trash2 } from 'lucide-react';
import { HeaderButton } from "@/components/ui/header-button";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UploadDocumentDialog } from '@/components/UploadDocumentDialog';
import { CreateProposalDialog } from '@/components/CreateProposalDialog';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentTemplatesSection } from '@/components/documents/DocumentTemplatesSection';
import { GeneratedDocumentsHistory } from '@/components/documents/GeneratedDocumentsHistory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Document {
  id: string;
  title: string;
  description: string | null;
  document_type: 'contract' | 'proposal' | 'client_doc' | 'property_doc' | 'other';
  file_path: string;
  file_size: number | null;
  version: number;
  created_at: string;
}

const DOCUMENT_TYPE_LABELS = {
  contract: 'Contrato',
  proposal: 'Proposta',
  client_doc: 'Documento do Cliente',
  property_doc: 'Documento do Imóvel',
  other: 'Outro',
};

// Map routes to tab values
const getTabFromPath = (pathname: string): string => {
  if (pathname.includes('/documents/templates')) return 'modelos';
  if (pathname.includes('/documents/history')) return 'historico';
  return 'meus-documentos';
};

const Documents = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  
  // Sync tab with route
  const activeTab = getTabFromPath(location.pathname);
  
  const handleTabChange = (value: string) => {
    switch (value) {
      case 'modelos':
        navigate('/documents/templates');
        break;
      case 'historico':
        navigate('/documents/history');
        break;
      default:
        navigate('/documents');
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  useEffect(() => {
    let filtered = documents;

    if (filterType !== 'all') {
      filtered = filtered.filter((doc) => doc.document_type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter((doc) =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
  }, [searchTerm, filterType, documents]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data as Document[] || []);
      setFilteredDocuments(data as Document[] || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar documentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Erro ao baixar documento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([deleteDoc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', deleteDoc.id);

      if (dbError) throw dbError;

      toast({
        title: 'Documento excluído!',
        description: 'O documento foi removido com sucesso.',
      });

      setDeleteDoc(null);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir documento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Desconhecido';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading || loadingDocs) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout
      title="Documentos"
      headerActions={
        <>
          <HeaderButton variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => setIsProposalDialogOpen(true)}>
            Nova Proposta
          </HeaderButton>
          <HeaderButton icon={<Plus className="h-4 w-4" />} onClick={() => setIsUploadDialogOpen(true)}>
            Upload
          </HeaderButton>
        </>
      }
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="meus-documentos">Meus Documentos</TabsTrigger>
            <TabsTrigger value="modelos">Modelos Padrão</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="meus-documentos" className="space-y-6 mt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="contract">Contratos</SelectItem>
                  <SelectItem value="proposal">Propostas</SelectItem>
                  <SelectItem value="client_doc">Docs do Cliente</SelectItem>
                  <SelectItem value="property_doc">Docs do Imóvel</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredDocuments.length === 0 ? (
              <Card className="py-12 text-center">
                <CardContent>
                  <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {searchTerm || filterType !== 'all'
                      ? 'Nenhum documento encontrado'
                      : 'Nenhum documento cadastrado'}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {searchTerm || filterType !== 'all'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Comece fazendo upload do primeiro documento'}
                  </p>
                  {!searchTerm && filterType === 'all' && (
                    <Button onClick={() => setIsUploadDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Upload de Documento
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <Badge variant="secondary">
                          {DOCUMENT_TYPE_LABELS[doc.document_type]}
                        </Badge>
                      </div>
                      {doc.description && (
                        <CardDescription className="line-clamp-2">
                          {doc.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>v{doc.version}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="mr-2 h-3 w-3" />
                          Baixar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteDoc(doc)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="modelos" className="mt-6">
            <DocumentTemplatesSection />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <GeneratedDocumentsHistory />
          </TabsContent>
        </Tabs>

        <UploadDocumentDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          onSuccess={loadDocuments}
        />

        <CreateProposalDialog
          open={isProposalDialogOpen}
          onOpenChange={setIsProposalDialogOpen}
          onSuccess={loadDocuments}
        />

        <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
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
    </AppLayout>
  );
};

export default Documents;
