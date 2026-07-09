import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Download, Pencil, Trash2, Plus, FileCheck, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomTemplateEditorDialog } from './CustomTemplateEditorDialog';
import { generateDocumentPDF } from '@/utils/pdfGenerator';
import { DocumentTemplate, TemplateField } from '@/utils/documentTemplates';
import { useIsMobile } from '@/hooks/use-mobile';

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

export const CustomTemplatesTab = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTemplate, setDeleteTemplate] = useState<ContractTemplate | null>(null);
  const [editTemplate, setEditTemplate] = useState<ContractTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar modelos', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', deleteTemplate.id);

      if (error) throw error;

      toast.success('Modelo excluído com sucesso');
      setDeleteTemplate(null);
      loadTemplates();
    } catch (error: any) {
      toast.error('Erro ao excluir modelo', { description: error.message });
    }
  };

  const handleDownload = async (template: ContractTemplate) => {
    const docTemplate: DocumentTemplate = {
      id: template.id,
      name: template.name,
      category: 'diversos',
      description: template.description || '',
      fields: extractFieldsFromContent(template.content),
      templateContent: template.content,
    };

    await generateDocumentPDF(docTemplate, {});
    toast.success('PDF gerado com sucesso');
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditTemplate(template);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditTemplate(null);
    loadTemplates();
  };

  // Extract variable names from template content to show available fields
  const extractFieldsFromContent = (content: string): TemplateField[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    const uniqueFields = [...new Set(matches.map(m => m[1]))];
    
    return uniqueFields.map(fieldId => ({
      id: fieldId,
      label: fieldId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'text' as const,
      section: 'Campos',
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando modelos...</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum modelo personalizado</h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-4">
          Você ainda não criou modelos customizados. Comece editando um modelo padrão na aba "Modelos Padrão" e clique em "Salvar Modelo" para criar sua versão personalizada.
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = '/documents/templates'}>
          <Plus className="h-4 w-4 mr-2" />
          Ir para Modelos Padrão
        </Button>
      </div>
    );
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <div className="flex items-start gap-3">
            <FileCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-medium text-sm">Modelos Personalizados</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Modelos salvos a partir de edições nos modelos padrão.
              </p>
            </div>
          </div>
        </div>

        {/* Card Grid for Mobile */}
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{template.name}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(template)}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteTemplate(template)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description || 'Sem descrição'}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
          <AlertDialogContent className="max-w-[90vw]">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o modelo "{deleteTemplate?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2">
              <AlertDialogCancel className="w-full">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Editor Dialog */}
        <CustomTemplateEditorDialog
          open={isEditorOpen}
          onOpenChange={handleEditorClose}
          template={editTemplate}
        />
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-start gap-3">
          <FileCheck className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium text-sm">Modelos Personalizados</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Modelos salvos a partir de edições nos modelos padrão. Estes modelos são exclusivos da sua conta.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[200px]">Nome do Modelo</TableHead>
                <TableHead className="min-w-[250px]">Descrição</TableHead>
                <TableHead className="w-[120px] text-center">Criado em</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || 'Sem descrição'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {new Date(template.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(template)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Baixar PDF</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{deleteTemplate?.name}"? Esta ação não pode ser desfeita.
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

      {/* Editor Dialog */}
      <CustomTemplateEditorDialog
        open={isEditorOpen}
        onOpenChange={handleEditorClose}
        template={editTemplate}
      />
    </div>
  );
};
