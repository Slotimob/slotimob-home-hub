import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Save, Copy, FileText, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateDocumentPDF } from '@/utils/pdfGenerator';
import { DocumentTemplate, TemplateField } from '@/utils/documentTemplates';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setContent(template.content);
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
          broker_id: user.id,
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

  const handleDownload = () => {
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

    generateDocumentPDF(docTemplate, {});
    toast.success('PDF gerado com sucesso');
  };

  const insertVariable = (variableName: string) => {
    const newContent = content + `{{${variableName}}}`;
    setContent(newContent);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editar Modelo Personalizado
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          {/* Form Section */}
          <div className="border-r overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-muted/50 border-b">
              <h3 className="font-medium text-sm">Configurações do Modelo</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
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
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Digite o conteúdo do contrato..."
                    className="min-h-[300px] font-mono text-sm"
                  />
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
                      variables.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs">
                          {`{{${v}}}`}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Preview Section */}
          <div className="overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-muted/50 border-b">
              <h3 className="font-medium text-sm">Pré-visualização</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="bg-white border rounded-lg p-6 shadow-sm min-h-full">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {content || 'O conteúdo do contrato aparecerá aqui...'}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button variant="secondary" onClick={handleSaveAsNew} disabled={saving}>
              <Copy className="mr-2 h-4 w-4" />
              Salvar como Novo
            </Button>
            <Button onClick={handleSaveUpdate} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
