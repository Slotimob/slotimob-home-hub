import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RotateCcw, Eye, Send, Save, FileText, Edit3 } from 'lucide-react';
import { DocumentTemplate, TemplateField } from '@/utils/documentTemplates';
import { generateDocumentPDF, fillTemplateContent } from '@/utils/pdfGenerator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { SendDocumentDialog } from './SendDocumentDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface DocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate | null;
  initialValues?: Record<string, string>;
  onSuccess?: () => void;
  isCustomTemplate?: boolean;
  customTemplateId?: string;
}

export const DocumentEditorDialog = ({ 
  open, 
  onOpenChange, 
  template, 
  initialValues, 
  onSuccess,
  isCustomTemplate = false,
  customTemplateId,
}: DocumentEditorDialogProps) => {
  const [filledFields, setFilledFields] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'preencher' | 'visualizar'>('preencher');
  const { user } = useAuth();
  const { toast: toastHook } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (template) {
      setEditableContent(template.templateContent);
      setShowContentEditor(false);
      
      if (initialValues && Object.keys(initialValues).length > 0) {
        setFilledFields(initialValues);
      } else {
        const defaults: Record<string, string> = {};
        template.fields.forEach((field) => {
          if (field.defaultValue) {
            defaults[field.id] = field.defaultValue;
          }
          if (field.type === 'date' && !field.defaultValue) {
            defaults[field.id] = new Date().toISOString().split('T')[0];
          }
        });
        setFilledFields(defaults);
      }
    }
  }, [template, initialValues]);

  useEffect(() => {
    if (template) {
      const contentToUse = editableContent || template.templateContent;
      const templateForPreview = { ...template, templateContent: contentToUse };
      setPreviewContent(fillTemplateContent(templateForPreview, filledFields));
    }
  }, [template, filledFields, editableContent]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFilledFields((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleReset = () => {
    if (template) {
      const defaults: Record<string, string> = {};
      template.fields.forEach((field) => {
        if (field.defaultValue) {
          defaults[field.id] = field.defaultValue;
        }
      });
      setFilledFields(defaults);
      setEditableContent(template.templateContent);
    }
  };

  // Salva automaticamente como rascunho antes de ação
  const saveAsDraft = async (): Promise<boolean> => {
    if (!template || !user) return false;

    try {
      const contentToSave = editableContent || template.templateContent;
      
      await supabase.from('generated_documents').insert({
        broker_id: user.id,
        template_id: template.id,
        template_name: template.name,
        filled_fields: filledFields,
      });

      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!template || !user) return;

    // Auto-save antes de gerar
    await saveAsDraft();
    toast.success('Documento salvo automaticamente');

    const contentToUse = editableContent || template.templateContent;
    const templateToGenerate = {
      ...template,
      templateContent: contentToUse,
    };

    generateDocumentPDF(templateToGenerate, filledFields);

    toastHook({
      title: 'PDF gerado com sucesso!',
      description: 'O documento foi salvo no seu histórico.',
    });
    
    onSuccess?.();
    onOpenChange(false);
  };

  const handleSaveAsCustomTemplate = async () => {
    if (!template || !user) return;

    setSaving(true);
    try {
      const contentToSave = editableContent || template.templateContent;
      
      // Substitui as variáveis preenchidas no conteúdo
      let finalContent = contentToSave;
      template.fields.forEach((field) => {
        const value = filledFields[field.id] || '';
        if (value) {
          const regex = new RegExp(`\\{\\{${field.id}\\}\\}`, 'g');
          finalContent = finalContent.replace(regex, value);
        }
      });
      
      const { error } = await supabase
        .from('contract_templates')
        .insert({
          broker_id: user.id,
          name: `${template.name} (Personalizado)`,
          description: template.description,
          content: finalContent,
          is_public: false,
        });

      if (error) throw error;

      toast.success('Modelo personalizado salvo!', {
        description: 'Acesse a aba "Modelos Personalizados" para ver seu modelo.',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar modelo', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!template || !user) return;

    // Auto-save antes de enviar
    await saveAsDraft();
    toast.success('Documento salvo automaticamente');

    setShowSendDialog(true);
  };

  const renderField = (field: TemplateField) => {
    const value = filledFields[field.id] || '';

    switch (field.type) {
      case 'select':
        return (
          <Select value={value} onValueChange={(v) => handleFieldChange(field.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Selecione...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  if (!template) return null;

  const sections = template.fields.reduce((acc, field) => {
    if (!acc[field.section]) acc[field.section] = [];
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, TemplateField[]>);

  // Form Section Component
  const FormSection = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 py-2 bg-muted/50 border-b">
        <h3 className="font-medium text-sm">Preencher Campos</h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {Object.entries(sections).map(([sectionName, fields]) => (
            <div key={sectionName} className="space-y-3">
              <h4 className="font-medium text-sm text-primary border-b pb-1">{sectionName}</h4>
              <div className="grid gap-3">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // Preview Section Component
  const PreviewSection = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
        <h3 className="font-medium text-sm">Pré-visualização</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setShowContentEditor(!showContentEditor)}
            >
              {showContentEditor ? 'Ver Preview' : 'Editar Conteúdo'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showContentEditor ? 'Voltar para visualização' : 'Editar o texto do contrato diretamente'}
          </TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="flex-1 p-4">
        {showContentEditor ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Edite o conteúdo do contrato. Use {'{{variavel}}'} para campos dinâmicos.
            </p>
            <Textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              className="min-h-[400px] font-mono text-xs"
              placeholder="Conteúdo do contrato..."
            />
            <div className="flex flex-wrap gap-1 pt-2">
              {template.fields.slice(0, 10).map((field) => (
                <Badge 
                  key={field.id} 
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-primary/10"
                  onClick={() => setEditableContent(prev => prev + `{{${field.id}}}`)}
                >
                  {`{{${field.id}}}`}
                </Badge>
              ))}
              {template.fields.length > 10 && (
                <Badge variant="outline" className="text-xs">+{template.fields.length - 10} mais</Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-card border rounded-lg p-6 shadow-sm min-h-full">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
              {previewContent}
            </pre>
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <DialogTitle className="text-base">{template.name}</DialogTitle>
              </div>
              <Badge variant={isCustomTemplate ? "default" : "secondary"} className="shrink-0">
                {isCustomTemplate ? (
                  <>
                    <Edit3 className="h-3 w-3 mr-1" />
                    Modelo Editado
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    Modelo Padrão
                  </>
                )}
              </Badge>
            </div>
          </DialogHeader>

          {/* Desktop Layout: Split View */}
          {!isMobile ? (
            <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
              <div className="border-r overflow-hidden flex flex-col">
                <FormSection />
              </div>
              <PreviewSection />
            </div>
          ) : (
            /* Mobile Layout: Tabs */
            <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'preencher' | 'visualizar')} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preencher">Preencher</TabsTrigger>
                  <TabsTrigger value="visualizar">Visualizar</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="preencher" className="flex-1 overflow-hidden m-0">
                <FormSection />
              </TabsContent>
              <TabsContent value="visualizar" className="flex-1 overflow-hidden m-0">
                <PreviewSection />
              </TabsContent>
            </Tabs>
          )}

          <div className="px-6 py-4 border-t flex flex-col sm:flex-row justify-between gap-3">
            <Button variant="outline" onClick={handleReset} className="order-2 sm:order-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <div className="flex flex-wrap gap-2 order-1 sm:order-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    onClick={handleSaveAsCustomTemplate}
                    disabled={saving}
                    className="flex-1 sm:flex-none"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Modelo'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Salvar como modelo personalizado para uso futuro
                </TooltipContent>
              </Tooltip>
              <Button variant="secondary" onClick={handleSend} className="flex-1 sm:flex-none">
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </Button>
              <Button onClick={handleGenerate} className="flex-1 sm:flex-none">
                <Download className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SendDocumentDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        template={template}
        filledFields={filledFields}
      />
    </>
  );
};
