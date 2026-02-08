import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, RotateCcw, Eye, Send } from 'lucide-react';
import { DocumentTemplate, TemplateField } from '@/utils/documentTemplates';
import { generateDocumentPDF, fillTemplateContent } from '@/utils/pdfGenerator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AutoFillSelector } from './AutoFillSelector';
import { SendDocumentDialog } from './SendDocumentDialog';

export interface DocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate | null;
  initialValues?: Record<string, string>;
  onSuccess?: () => void;
}

export const DocumentEditorDialog = ({ open, onOpenChange, template, initialValues, onSuccess }: DocumentEditorDialogProps) => {
  const [filledFields, setFilledFields] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (template) {
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
      setPreviewContent(fillTemplateContent(template, filledFields));
    }
  }, [template, filledFields]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFilledFields((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleAutoFill = (fields: Record<string, string>) => {
    setFilledFields((prev) => ({ ...prev, ...fields }));
    toast({
      title: 'Campos preenchidos',
      description: 'Os dados foram inseridos automaticamente.',
    });
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
    }
  };

  const handleGenerate = async () => {
    if (!template || !user) return;

    generateDocumentPDF(template, filledFields);

    try {
      await supabase.from('generated_documents').insert({
        broker_id: user.id,
        template_id: template.id,
        template_name: template.name,
        filled_fields: filledFields,
      });
      
      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O documento foi salvo no seu histórico.',
      });
      onSuccess?.();
    } catch (error) {
      console.error('Error saving generated document:', error);
    }

    onOpenChange(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {template.name}
              </DialogTitle>
              <AutoFillSelector onAutoFill={handleAutoFill} />
            </div>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
            {/* Form Section */}
            <div className="border-r overflow-hidden flex flex-col">
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

            {/* Preview Section */}
            <div className="overflow-hidden flex flex-col">
              <div className="px-4 py-2 bg-muted/50 border-b">
                <h3 className="font-medium text-sm">Pré-visualização</h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="bg-white border rounded-lg p-6 shadow-sm min-h-full">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                    {previewContent}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button variant="secondary" onClick={() => setShowSendDialog(true)}>
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </Button>
              <Button onClick={handleGenerate}>
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
