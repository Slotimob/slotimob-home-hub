import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor, htmlToPlainText } from '@/components/ui/rich-text-editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Save, Copy, FileText, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from 'sonner';
import { generateDocumentPDF } from '@/utils/pdfGenerator';
import { DocumentTemplate, TemplateField } from '@/utils/documentTemplates';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

interface CustomTemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContractTemplate | null;
}

export const CustomTemplateEditorDialog = ({
  open,
  onOpenChange,
  template,
}: CustomTemplateEditorDialogProps) => {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const isMobile = useIsMobile();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'config' | 'preview'>('config');

  // Modelos antigos guardam texto puro (textarea). Converte para HTML para não
  // perder as quebras de linha ao abrir no editor rico.
  const plainTextToHtml = (text: string): string => {
    if (!text) return '';
    if (/<(p|h[1-6]|ul|ol|li|br|strong|em)\b/i.test(text)) return text;
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return text
      .split('\n')
      .map((line) => `<p>${escape(line) || '<br>'}</p>`)
      .join('');
  };

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setContent(plainTextToHtml(template.content));
    }
  }, [template]);

  // Extract variables from content
  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...text.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  };

  const variables = extractVariables(content);

  const handleSaveUpdate = async () => {
    if (!template || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('contract_templates')
        .update({
          name,
          description,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      if (error) throw error;

      toast.success('Modelo atualizado com sucesso');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao atualizar modelo', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('contract_templates')
        .insert({
          broker_id: effectiveBrokerId,
          name: `${name} (Cópia)`,
          description,
          content,
          is_public: false,
        });

      if (error) throw error;

      toast.success('Novo modelo criado com sucesso');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao criar modelo', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const docTemplate: DocumentTemplate = {
      id: template?.id || 'custom',
      name,
      category: 'diversos',
      description,
      fields: variables.map(v => ({
        id: v,
        label: v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'text' as const,
        section: 'Campos',
      })),
      templateContent: content,
    };

    await generateDocumentPDF(docTemplate, {});
    toast.success('PDF gerado com sucesso');
  };

  if (!template) return null;

  // Form Content
  const FormContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Modelo</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do modelo"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descrição do modelo"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">Conteúdo do Contrato</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Use {'{{nome_variavel}}'} para inserir campos dinâmicos que serão substituídos ao gerar o documento.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Digite o conteúdo do contrato..."
        />
        <p className="text-xs text-muted-foreground">
          Placeholders como {'{{nome_variavel}}'} são substituídos na geração do documento.
        </p>
      </div>

      {/* Variables Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Variáveis Encontradas ({variables.length})</Label>
        <div className="flex flex-wrap gap-1.5">
          {variables.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma variável encontrada. Use {'{{nome}}'} para adicionar.
            </p>
          ) : (
            variables.slice(0, 10).map((v) => (
              <Badge key={v} variant="secondary" className="text-xs">
                {`{{${v}}}`}
              </Badge>
            ))
          )}
          {variables.length > 10 && (
            <Badge variant="outline" className="text-xs">+{variables.length - 10} mais</Badge>
          )}
        </div>
      </div>
    </div>
  );

  // Preview Content
  const PreviewContent = () => (
    <div 
      className="bg-white dark:bg-card border rounded-lg shadow-sm mx-auto"
      style={{
        maxWidth: isMobile ? '100%' : '210mm',
        minHeight: isMobile ? '300px' : '400px',
        padding: isMobile ? '16px' : '25mm 20mm',
      }}
    >
      <pre 
        className="whitespace-pre-wrap font-mono leading-relaxed text-foreground"
        style={{ fontSize: isMobile ? '10px' : '12px' }}
      >
        {content || 'O conteúdo do contrato aparecerá aqui...'}
      </pre>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`flex flex-col p-0 ${
          isMobile 
            ? 'w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh]' 
            : 'max-w-5xl h-[85vh]'
        }`}
      >
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Editar Modelo Personalizado
          </DialogTitle>
        </DialogHeader>

        {/* Mobile: Tabs layout */}
        {isMobile ? (
          <Tabs 
            value={mobileTab} 
            onValueChange={(v) => setMobileTab(v as 'config' | 'preview')} 
            className="flex-1 flex flex-col overflow-hidden min-h-0"
          >
            <div className="px-3 py-2 border-b shrink-0">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="config" className="text-xs">Configurações</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Pré-visualização</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="config" className="flex-1 overflow-hidden m-0 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <FormContent />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="preview" className="flex-1 overflow-hidden m-0 min-h-0 bg-muted/30">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <PreviewContent />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          /* Desktop: Split view */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden min-h-0">
            {/* Form Section */}
            <div className="border-r overflow-hidden flex flex-col">
              <div className="px-4 py-2 bg-muted/50 border-b shrink-0">
                <h3 className="font-medium text-sm">Configurações do Modelo</h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <FormContent />
                </div>
              </ScrollArea>
            </div>

            {/* Preview Section */}
            <div className="overflow-hidden flex flex-col bg-muted/30">
              <div className="px-4 py-2 bg-muted/50 border-b shrink-0">
                <h3 className="font-medium text-sm">Pré-visualização</h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <PreviewContent />
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t shrink-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              size={isMobile ? "sm" : "default"}
              className="order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <div className="flex flex-wrap gap-2 order-1 sm:order-2">
              <Button 
                variant="outline" 
                onClick={handleDownload}
                size={isMobile ? "sm" : "default"}
                className="flex-1 sm:flex-none"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Baixar PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleSaveAsNew} 
                disabled={saving}
                size={isMobile ? "sm" : "default"}
                className="flex-1 sm:flex-none"
              >
                <Copy className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Salvar como Novo</span>
                <span className="sm:hidden">Novo</span>
              </Button>
              <Button 
                onClick={handleSaveUpdate} 
                disabled={saving}
                size={isMobile ? "sm" : "default"}
                className="flex-1 sm:flex-none"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Salvando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
