import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RotateCcw, Send, Save, FileText, Edit3 } from 'lucide-react';
import { DocumentTemplate, TemplateField } from '@/utils/documentTemplates';
import { generateDocumentPDF, fillTemplateContent } from '@/utils/pdfGenerator';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
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
  existingDraftId?: string; // ID of existing draft for UPDATE instead of INSERT
}

export const DocumentEditorDialog = ({ 
  open, 
  onOpenChange, 
  template, 
  initialValues, 
  onSuccess,
  isCustomTemplate = false,
  customTemplateId,
  existingDraftId,
}: DocumentEditorDialogProps) => {
  const [filledFields, setFilledFields] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'preencher' | 'visualizar'>('preencher');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(existingDraftId || null);
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const isMobile = useIsMobile();
  
  // Debounce timer for preview updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate required fields completion percentage
  const completionPercentage = useMemo(() => {
    if (!template) return 0;
    const requiredFields = template.fields.filter(f => f.required);
    if (requiredFields.length === 0) return 100;
    const filledRequired = requiredFields.filter(f => filledFields[f.id]?.trim());
    return Math.round((filledRequired.length / requiredFields.length) * 100);
  }, [template, filledFields]);

  useEffect(() => {
    if (template) {
      setEditableContent(template.templateContent);
      setShowContentEditor(false);
      setCurrentDraftId(existingDraftId || null);
      
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
  }, [template, initialValues, existingDraftId]);

  // Debounced preview update (300ms)
  useEffect(() => {
    if (!template) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const contentToUse = editableContent || template.templateContent;
      const templateForPreview = { ...template, templateContent: contentToUse };
      setPreviewContent(fillTemplateContent(templateForPreview, filledFields));
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
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

  // Save as draft with upsert logic (UPDATE if exists, INSERT if new)
  const saveAsDraft = useCallback(async (): Promise<string | null> => {
    if (!template || !user) return null;

    try {
      if (currentDraftId) {
        // UPDATE existing draft
        const { error } = await supabase
          .from('generated_documents')
          .update({
            filled_fields: filledFields,
          })
          .eq('id', currentDraftId);

        if (error) throw error;
        return currentDraftId;
      } else {
        // INSERT new draft
        const { data, error } = await supabase
          .from('generated_documents')
          .insert({
            broker_id: effectiveBrokerId || user.id,
            template_id: template.id,
            template_name: template.name,
            filled_fields: filledFields,
          })
          .select('id')
          .single();

        if (error) throw error;
        setCurrentDraftId(data.id);
        return data.id;
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      return null;
    }
  }, [template, user, filledFields, currentDraftId]);

  const handleGenerate = async () => {
    if (!template || !user) return;

    // Auto-save draft before generating PDF
    const draftId = await saveAsDraft();
    if (draftId) {
      toast.success('Rascunho salvo automaticamente');
    }

    const contentToUse = editableContent || template.templateContent;
    const templateToGenerate = {
      ...template,
      templateContent: contentToUse,
    };

    generateDocumentPDF(templateToGenerate, filledFields);

    toast.success('PDF gerado com sucesso!', {
      description: 'O documento foi baixado e salvo nos rascunhos.',
    });
    
    onSuccess?.();
    onOpenChange(false);
  };

  const handleSaveAsCustomTemplate = async () => {
    if (!template || !user) return;

    setSaving(true);
    try {
      const contentToSave = editableContent || template.templateContent;
      
      // Replace filled variables in content
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
          broker_id: effectiveBrokerId || user.id,
          name: `${template.name} (Personalizado)`,
          description: template.description,
          content: finalContent,
          is_public: false,
        });

      if (error) throw error;

      toast.success('Modelo salvo na sua biblioteca personalizada', {
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

    // Auto-save draft before sending
    const draftId = await saveAsDraft();
    if (draftId) {
      toast.success('Rascunho salvo automaticamente');
    }

    setShowSendDialog(true);
  };

  const renderField = (field: TemplateField) => {
    const value = filledFields[field.id] || '';

    switch (field.type) {
      case 'select':
        return (
          <Select value={value} onValueChange={(v) => handleFieldChange(field.id, v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || 'Selecione...'} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
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
            className="resize-none"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full"
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
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 py-2 bg-muted/50 border-b shrink-0">
        <h3 className="font-medium text-sm">Preencher Campos</h3>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {Object.entries(sections).map(([sectionName, fields]) => (
            <div key={sectionName} className="space-y-3">
              <h4 className="font-medium text-sm text-primary border-b pb-1">{sectionName}</h4>
              <div className="grid gap-3">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
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

  // Preview Section Component with A4 paper styling
  const PreviewSection = () => (
    <div className="h-full flex flex-col min-h-0 bg-muted/30">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between shrink-0">
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
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {showContentEditor ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Edite o conteúdo do contrato. Use {'{{variavel}}'} para campos dinâmicos.
              </p>
              <Textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="min-h-[400px] font-mono text-xs resize-none"
                placeholder="Conteúdo do contrato..."
              />
              <div className="flex flex-wrap gap-1 pt-2">
                {template.fields.slice(0, 8).map((field) => (
                  <Badge 
                    key={field.id} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-primary/10"
                    onClick={() => setEditableContent(prev => prev + `{{${field.id}}}`)}
                  >
                    {`{{${field.id}}}`}
                  </Badge>
                ))}
                {template.fields.length > 8 && (
                  <Badge variant="outline" className="text-xs">+{template.fields.length - 8} mais</Badge>
                )}
              </div>
            </div>
          ) : (
            // A4 Paper simulation
            <div 
              className="bg-white dark:bg-card border rounded-lg shadow-md mx-auto"
              style={{
                maxWidth: '210mm',
                minHeight: isMobile ? '400px' : '297mm',
                padding: isMobile ? '16px' : '25mm 20mm',
              }}
            >
              <pre 
                className="whitespace-pre-wrap font-mono leading-relaxed text-foreground"
                style={{ fontSize: isMobile ? '10px' : '12px' }}
              >
                {previewContent}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className={`flex flex-col p-0 ${
            isMobile 
              ? 'w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh]' 
              : 'max-w-6xl h-[90vh]'
          }`}
        >
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
            <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <DialogTitle className="text-sm sm:text-base truncate">{template.name}</DialogTitle>
              </div>
              <Badge 
                variant={isCustomTemplate ? "default" : "secondary"} 
                className="shrink-0 text-xs"
              >
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

          {/* Desktop Layout: Split View with independent scrolls */}
          {!isMobile ? (
            <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden min-h-0">
              <div className="border-r overflow-hidden">
                <FormSection />
              </div>
              <div className="overflow-hidden">
                <PreviewSection />
              </div>
            </div>
          ) : (
            /* Mobile Layout: Tabs with completion badge */
            <Tabs 
              value={mobileTab} 
              onValueChange={(v) => setMobileTab(v as 'preencher' | 'visualizar')} 
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <div className="px-3 py-2 border-b shrink-0">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="preencher" className="text-xs relative">
                    Preencher
                    {completionPercentage < 100 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-1.5 h-5 px-1.5 text-[10px] font-medium"
                      >
                        {completionPercentage}%
                      </Badge>
                    )}
                    {completionPercentage === 100 && (
                      <Badge 
                        variant="default"
                        className="ml-1.5 h-5 px-1.5 text-[10px] font-medium"
                      >
                        ✓
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="visualizar" className="text-xs">Visualizar</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="preencher" className="flex-1 overflow-hidden m-0 min-h-0">
                <FormSection />
              </TabsContent>
              <TabsContent value="visualizar" className="flex-1 overflow-hidden m-0 min-h-0">
                <div className="h-full overflow-x-auto">
                  <PreviewSection />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action buttons - responsive */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t shrink-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button 
                variant="outline" 
                onClick={handleReset} 
                size={isMobile ? "sm" : "default"}
                className="order-2 sm:order-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpar
              </Button>
              
              <div className="flex flex-wrap gap-2 order-1 sm:order-2">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  size={isMobile ? "sm" : "default"}
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      onClick={handleSaveAsCustomTemplate}
                      disabled={saving}
                      size={isMobile ? "sm" : "default"}
                      className="flex-1 sm:flex-none"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar Modelo'}</span>
                      <span className="sm:hidden">{saving ? '...' : 'Salvar'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Salvar como modelo personalizado para uso futuro
                  </TooltipContent>
                </Tooltip>
                
                <Button 
                  variant="secondary" 
                  onClick={handleSend}
                  size={isMobile ? "sm" : "default"}
                  className="flex-1 sm:flex-none"
                >
                  <Send className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </Button>
                
                <Button 
                  onClick={handleGenerate}
                  size={isMobile ? "sm" : "default"}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Gerar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </div>
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
