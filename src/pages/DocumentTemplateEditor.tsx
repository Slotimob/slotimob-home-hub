import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, RotateCcw, Send, Save, FileText, Sparkles } from 'lucide-react';
import { getTemplateById, TemplateField } from '@/utils/documentTemplates';
import { generateDocumentPDF, fillTemplateContent } from '@/utils/pdfGenerator';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SendDocumentDialog } from '@/components/documents/SendDocumentDialog';
import { AIImproveDocumentDialog } from '@/components/documents/AIImproveDocumentDialog';
import { useIsMobile } from '@/hooks/use-mobile';

export default function DocumentTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const isMobile = useIsMobile();

  const template = useMemo(() => getTemplateById(templateId || '') || null, [templateId]);

  const [filledFields, setFilledFields] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'preencher' | 'visualizar'>('preencher');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const completionPercentage = useMemo(() => {
    if (!template) return 0;
    const requiredFields = template.fields.filter((f) => f.required);
    if (requiredFields.length === 0) return 100;
    const filledRequired = requiredFields.filter((f) => filledFields[f.id]?.trim());
    return Math.round((filledRequired.length / requiredFields.length) * 100);
  }, [template, filledFields]);

  useEffect(() => {
    if (!template) return;
    setEditableContent(template.templateContent);
    setShowContentEditor(false);
    setCurrentDraftId(null);
    const defaults: Record<string, string> = {};
    template.fields.forEach((field) => {
      if (field.defaultValue) defaults[field.id] = field.defaultValue;
      if (field.type === 'date' && !field.defaultValue) {
        defaults[field.id] = new Date().toISOString().split('T')[0];
      }
    });
    setFilledFields(defaults);
  }, [template]);

  useEffect(() => {
    if (!template) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const contentToUse = editableContent || template.templateContent;
      setPreviewContent(
        fillTemplateContent({ ...template, templateContent: contentToUse }, filledFields)
      );
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [template, filledFields, editableContent]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFilledFields((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleReset = () => {
    if (!template) return;
    const defaults: Record<string, string> = {};
    template.fields.forEach((field) => {
      if (field.defaultValue) defaults[field.id] = field.defaultValue;
    });
    setFilledFields(defaults);
    setEditableContent(template.templateContent);
  };

  const saveAsDraft = useCallback(async (): Promise<string | null> => {
    if (!template || !user) return null;
    try {
      if (currentDraftId) {
        const { error } = await supabase
          .from('generated_documents')
          .update({ filled_fields: filledFields })
          .eq('id', currentDraftId);
        if (error) throw error;
        return currentDraftId;
      }
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
    } catch (error) {
      console.error('Error saving draft:', error);
      return null;
    }
  }, [template, user, filledFields, currentDraftId, effectiveBrokerId]);

  const handleGenerate = async () => {
    if (!template || !user) return;
    const draftId = await saveAsDraft();
    if (draftId) toast.success('Rascunho salvo automaticamente');
    const contentToUse = editableContent || template.templateContent;
    await generateDocumentPDF({ ...template, templateContent: contentToUse }, filledFields);
    toast.success('PDF gerado com sucesso!', {
      description: 'O documento foi baixado e salvo nos rascunhos.',
    });
  };

  const handleSend = async () => {
    if (!template || !user) return;
    const draftId = await saveAsDraft();
    if (draftId) toast.success('Rascunho salvo automaticamente');
    setShowSendDialog(true);
  };

  const handleSaveAsCustomTemplate = async () => {
    if (!template || !user) return;
    setSaving(true);
    try {
      let finalContent = editableContent || template.templateContent;
      template.fields.forEach((field) => {
        const value = filledFields[field.id] || '';
        if (value) {
          const regex = new RegExp(`\\{\\{${field.id}\\}\\}`, 'g');
          finalContent = finalContent.replace(regex, value);
        }
      });
      const { error } = await supabase.from('contract_templates').insert({
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
    } catch (error: any) {
      toast.error('Erro ao salvar modelo', { description: error.message });
    } finally {
      setSaving(false);
    }
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
          <Input type="date" value={value} onChange={(e) => handleFieldChange(field.id, e.target.value)} />
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

  if (!template) {
    return (
      <AppLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">Modelo não encontrado.</p>
          <Button variant="outline" onClick={() => navigate('/documents/templates')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos modelos
          </Button>
        </div>
      </AppLayout>
    );
  }

  const sections = template.fields.reduce((acc, field) => {
    if (!acc[field.section]) acc[field.section] = [];
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, TemplateField[]>);

  const currentContent = editableContent || template.templateContent;

  const previewPanel = (
    <div className="h-full flex flex-col min-h-0 bg-muted/30">
      <div className="px-4 py-2 bg-card border-b flex items-center justify-between shrink-0">
        <h3 className="font-medium text-sm">Pré-visualização</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowContentEditor((v) => !v)}
        >
          {showContentEditor ? 'Ver preview' : 'Editar conteúdo'}
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {showContentEditor ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Edite o conteúdo do contrato. Use {'{{variavel}}'} para campos dinâmicos.
            </p>
            <Textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              className="min-h-[60vh] font-mono text-xs resize-none"
              placeholder="Conteúdo do contrato..."
            />
            <div className="flex flex-wrap gap-1 pt-2">
              {template.fields.slice(0, 12).map((field) => (
                <Badge
                  key={field.id}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-primary/10"
                  onClick={() => setEditableContent((prev) => prev + `{{${field.id}}}`)}
                >
                  {`{{${field.id}}}`}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="bg-card border rounded-lg shadow-md mx-auto"
            style={{
              maxWidth: '210mm',
              minHeight: isMobile ? '400px' : '297mm',
              padding: isMobile ? '16px' : '25mm 20mm',
            }}
          >
            <pre
              className="whitespace-pre-wrap font-mono leading-relaxed text-foreground"
              style={{ fontSize: isMobile ? '11px' : '13px' }}
            >
              {previewContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  const formPanel = (
    <div className="h-full flex flex-col min-h-0 bg-card">
      <div className="px-4 py-2 border-b shrink-0 flex items-center justify-between">
        <h3 className="font-medium text-sm">Preencher campos</h3>
        <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'} className="text-[10px]">
          {completionPercentage}%
        </Badge>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
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
      <div className="border-t p-3 space-y-2 shrink-0">
        <Button
          variant="secondary"
          className="w-full"
          disabled={!currentContent.trim()}
          onClick={() => setShowAIDialog(true)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Melhorar com IA
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpar
          </Button>
          <Button variant="outline" onClick={handleSaveAsCustomTemplate} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar modelo'}
          </Button>
          <Button variant="secondary" onClick={handleSend}>
            <Send className="mr-2 h-4 w-4" />
            Enviar
          </Button>
          <Button onClick={handleGenerate}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] min-h-0">
        <div className="flex items-center gap-3 px-1 pb-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/documents/templates')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-base sm:text-lg font-semibold truncate">{template.name}</h1>
        </div>

        {isMobile ? (
          <Tabs
            value={mobileTab}
            onValueChange={(v) => setMobileTab(v as 'preencher' | 'visualizar')}
            className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden"
          >
            <div className="p-2 border-b shrink-0 bg-card">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="preencher" className="text-xs">Preencher</TabsTrigger>
                <TabsTrigger value="visualizar" className="text-xs">Visualizar</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preencher" className="flex-1 m-0 min-h-0 overflow-hidden">
              {formPanel}
            </TabsContent>
            <TabsContent value="visualizar" className="flex-1 m-0 min-h-0 overflow-hidden">
              {previewPanel}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-[65fr_35fr] border rounded-lg overflow-hidden">
            <div className="border-r min-h-0 overflow-hidden">{previewPanel}</div>
            <div className="min-h-0 overflow-hidden">{formPanel}</div>
          </div>
        )}
      </div>

      <SendDocumentDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        template={template}
        filledFields={filledFields}
      />

      <AIImproveDocumentDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        content={currentContent}
        onApply={(improved) => {
          setEditableContent(improved);
          setShowContentEditor(false);
        }}
      />
    </AppLayout>
  );
}
