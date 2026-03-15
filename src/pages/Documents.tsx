import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText, Search, Download, Trash2, Building2, ExternalLink } from 'lucide-react';
import { HeaderButton } from "@/components/ui/header-button";
import { PermissionGate } from "@/components/subscription/PermissionGate";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UploadDocumentDialog } from '@/components/UploadDocumentDialog';
import { CreateProposalDialog } from '@/components/CreateProposalDialog';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentTemplatesSection } from '@/components/documents/DocumentTemplatesSection';
import { GeneratedDocumentsHistory } from '@/components/documents/GeneratedDocumentsHistory';
import { CustomTemplatesTab } from '@/components/documents/CustomTemplatesTab';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DocumentUnit {
  unit_number: string | null;
  is_standalone?: boolean;
  properties: { name: string } | null;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  document_type: 'contract' | 'proposal' | 'client_doc' | 'property_doc' | 'other';
  file_path: string;
  file_size: number | null;
  version: number;
  created_at: string;
  unit_id: string | null;
  units: DocumentUnit | null;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  proposal: 'Proposta',
  client_doc: 'Doc. Cliente',
  property_doc: 'Doc. Imóvel',
  other: 'Outro',
};

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  proposal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  client_doc: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  property_doc: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
};

// Map routes to tab values
const getTabFromPath = (pathname: string): string => {
  if (pathname.includes('/documents/templates')) return 'modelos';
  if (pathname.includes('/documents/custom')) return 'personalizados';
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
      case 'personalizados':
        navigate('/documents/custom');
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
        .select('*, units(unit_number, is_standalone, properties(name))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as Document[]) || []);
      setFilteredDocuments((data as Document[]) || []);
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
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUnitLabel = (doc: Document): string => {
    if (!doc.units) return 'Não vinculado';
    if (doc.units.is_standalone) {
      return doc.units.unit_number || 'Imóvel Avulso';
    }
    const unitNumber = doc.units.unit_number || 'Unidade';
    const propertyName = doc.units.properties?.name || '';
    return propertyName ? `${unitNumber} - ${propertyName}` : unitNumber;
  };

  const handleNavigateToUnit = (doc: Document) => {
    if (!doc.unit_id) return;
    // Check if it's standalone (real estate) or a unit in a property
    if (doc.units?.is_standalone) {
      navigate(`/real-estate?selected=${doc.unit_id}`);
    } else {
      navigate(`/units?selected=${doc.unit_id}`);
    }
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
          <PermissionGate permission="documents.generate">
            <HeaderButton variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => setIsProposalDialogOpen(true)}>
              Nova Proposta
            </HeaderButton>
          </PermissionGate>
          <HeaderButton icon={<Plus className="h-4 w-4" />} onClick={() => setIsUploadDialogOpen(true)}>
            Upload
          </HeaderButton>
        </>
      }
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto min-w-max">
              <TabsTrigger value="meus-documentos" className="text-xs sm:text-sm whitespace-nowrap">Meus Documentos</TabsTrigger>
              <TabsTrigger value="modelos" className="text-xs sm:text-sm whitespace-nowrap">Modelos Padrão</TabsTrigger>
              <TabsTrigger value="personalizados" className="text-xs sm:text-sm whitespace-nowrap">Personalizados</TabsTrigger>
              <TabsTrigger value="historico" className="text-xs sm:text-sm whitespace-nowrap">Rascunhos</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="meus-documentos" className="space-y-6 mt-6">
            {/* Filters Row */}
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
              <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[200px]">Nome</TableHead>
                        <TableHead className="w-[120px]">Tipo</TableHead>
                        <TableHead className="min-w-[180px]">Imóvel</TableHead>
                        <TableHead className="w-[120px] text-center">Tamanho / Versão</TableHead>
                        <TableHead className="w-[100px] text-center">Data</TableHead>
                        <TableHead className="w-[140px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                          {/* Nome */}
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-foreground line-clamp-1">{doc.title}</span>
                              {doc.description && (
                                <span className="text-xs text-muted-foreground line-clamp-1">{doc.description}</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Tipo */}
                          <TableCell>
                            <Badge className={`text-xs font-normal ${DOCUMENT_TYPE_COLORS[doc.document_type]}`}>
                              {DOCUMENT_TYPE_LABELS[doc.document_type]}
                            </Badge>
                          </TableCell>

                          {/* Imóvel */}
                          <TableCell>
                            <span className={`text-sm ${doc.unit_id ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                              {getUnitLabel(doc)}
                            </span>
                          </TableCell>

                          {/* Tamanho / Versão */}
                          <TableCell className="text-center">
                            <span className="text-sm text-muted-foreground">
                              {formatFileSize(doc.file_size)} | v{doc.version}
                            </span>
                          </TableCell>

                          {/* Data */}
                          <TableCell className="text-center">
                            <span className="text-sm text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </TableCell>

                          {/* Ações */}
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDownload(doc)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Baixar</TooltipContent>
                              </Tooltip>

                              {doc.unit_id && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleNavigateToUnit(doc)}
                                    >
                                      <Building2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ir para Imóvel</TooltipContent>
                                </Tooltip>
                              )}

                              <PermissionGate permission="documents.delete">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeleteDoc(doc)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir</TooltipContent>
                                </Tooltip>
                              </PermissionGate>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="modelos" className="mt-6">
            <DocumentTemplatesSection />
          </TabsContent>

          <TabsContent value="personalizados" className="mt-6">
            <CustomTemplatesTab />
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
