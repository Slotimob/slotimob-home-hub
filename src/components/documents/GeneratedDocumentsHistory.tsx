import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  FileText, 
  Search, 
  Download, 
  Trash2, 
  Edit, 
  Send,
  Clock,
  RefreshCw,
  Filter,
  CalendarIcon,
  X
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTemplateById, CATEGORY_LABELS, CATEGORY_COLORS } from '@/utils/documentTemplates';
import { generateDocumentPDF } from '@/utils/pdfGenerator';
import { DocumentEditorDialog } from './DocumentEditorDialog';
import { SendDocumentDialog } from './SendDocumentDialog';
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

interface GeneratedDocument {
  id: string;
  template_id: string | null;
  template_name: string;
  filled_fields: Record<string, string>;
  created_at: string;
}

type CategoryFilter = 'all' | 'captacao' | 'recibos' | 'vistorias' | 'diversos' | 'locacao';

export function GeneratedDocumentsHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDoc, setDeleteDoc] = useState<GeneratedDocument | null>(null);
  const [editDoc, setEditDoc] = useState<GeneratedDocument | null>(null);
  const [sendDoc, setSendDoc] = useState<GeneratedDocument | null>(null);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...documents];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.template_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => {
        const template = doc.template_id ? getTemplateById(doc.template_id) : null;
        return template?.category === categoryFilter;
      });
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(doc => 
        isAfter(new Date(doc.created_at), startOfDay(dateFrom)) || 
        format(new Date(doc.created_at), 'yyyy-MM-dd') === format(dateFrom, 'yyyy-MM-dd')
      );
    }

    if (dateTo) {
      filtered = filtered.filter(doc => 
        isBefore(new Date(doc.created_at), endOfDay(dateTo)) ||
        format(new Date(doc.created_at), 'yyyy-MM-dd') === format(dateTo, 'yyyy-MM-dd')
      );
    }

    setFilteredDocuments(filtered);
  }, [searchTerm, documents, categoryFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchTerm('');
  };

  const hasActiveFilters = categoryFilter !== 'all' || dateFrom || dateTo || searchTerm;

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDocuments((data || []).map(doc => ({
        ...doc,
        filled_fields: doc.filled_fields as Record<string, string>
      })));
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: GeneratedDocument) => {
    const template = doc.template_id ? getTemplateById(doc.template_id) : null;
    
    if (!template) {
      toast({
        title: 'Erro',
        description: 'Template não encontrado',
        variant: 'destructive',
      });
      return;
    }

    try {
      await generateDocumentPDF(template, doc.filled_fields);
      toast({
        title: 'PDF gerado!',
        description: 'O documento foi baixado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;

    try {
      const { error } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', deleteDoc.id);

      if (error) throw error;

      toast({
        title: 'Documento excluído!',
        description: 'O documento foi removido do histórico.',
      });
      setDeleteDoc(null);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTemplateCategory = (templateId: string | null) => {
    if (!templateId) return null;
    const template = getTemplateById(templateId);
    return template?.category || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={showFilters ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={loadDocuments}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="p-4">
            <CardContent className="p-0 space-y-4">
              <div className="flex flex-wrap gap-4">
                {/* Category Filter */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Label className="text-sm font-medium">Categoria</Label>
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      <SelectItem value="captacao">Fichas de Captação</SelectItem>
                      <SelectItem value="recibos">Recibos</SelectItem>
                      <SelectItem value="vistorias">Visitas e Vistorias</SelectItem>
                      <SelectItem value="diversos">Documentos Diversos</SelectItem>
                      <SelectItem value="locacao">Locação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From Filter */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Label className="text-sm font-medium">Data inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To Filter */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Label className="text-sm font-medium">Data final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Summary */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          {filteredDocuments.length} documento(s) encontrado(s)
        </div>
      )}

      {filteredDocuments.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {searchTerm ? 'Nenhum documento encontrado' : 'Nenhum documento gerado'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm 
                ? 'Tente ajustar a busca' 
                : 'Os documentos que você gerar aparecerão aqui'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const category = getTemplateCategory(doc.template_id);
            const categoryColor = category ? CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] : 'bg-muted';
            const categoryLabel = category ? CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] : 'Documento';

            return (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-medium text-sm line-clamp-2">{doc.template_name}</h3>
                    </div>
                    <Badge className={`${categoryColor} text-white text-xs shrink-0`}>
                      {categoryLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Baixar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditDoc(doc)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSendDoc(doc)}
                    >
                      <Send className="h-3 w-3" />
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
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {editDoc && editDoc.template_id && (
        <DocumentEditorDialog
          template={getTemplateById(editDoc.template_id)!}
          open={!!editDoc}
          onOpenChange={(open) => !open && setEditDoc(null)}
          initialValues={editDoc.filled_fields}
          onSuccess={loadDocuments}
        />
      )}

      {/* Send Dialog */}
      {sendDoc && sendDoc.template_id && (
        <SendDocumentDialog
          template={getTemplateById(sendDoc.template_id)!}
          filledFields={sendDoc.filled_fields}
          open={!!sendDoc}
          onOpenChange={(open) => !open && setSendDoc(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento do histórico? Esta ação não pode ser desfeita.
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
}
