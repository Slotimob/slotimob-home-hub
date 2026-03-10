import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const documentSchema = z.object({
  title: z.string().min(2, 'Título deve ter no mínimo 2 caracteres').max(200),
  description: z.string().max(500).optional().nullable(),
  document_type: z.enum(['contract', 'proposal', 'client_doc', 'property_doc', 'other']),
  deal_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
});

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const UploadDocumentDialog = ({ open, onOpenChange, onSuccess }: UploadDocumentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [deals, setDeals] = useState<{ id: string; lead: { name: string } }[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string; is_standalone: boolean | null; address: string | null; property: { name: string } | null }[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'other' as const,
    deal_id: '',
    lead_id: '',
    unit_id: '',
  });

  useEffect(() => {
    if (open) {
      loadRelatedData();
    }
  }, [open]);

  const loadRelatedData = async () => {
    const [leadsRes, dealsRes, unitsRes] = await Promise.all([
      supabase.from('leads').select('id, name').order('name'),
      supabase.from('deals').select('id, lead:leads(name)').order('created_at', { ascending: false }),
      supabase.from('units').select('id, unit_number, is_standalone, address, property:properties(name)').order('unit_number'),
    ]);

    setLeads(leadsRes.data || []);
    setDeals(dealsRes.data || []);
    setUnits(unitsRes.data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 20MB.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      if (!formData.title) {
        setFormData({ ...formData, title: selectedFile.name });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Selecione um arquivo para fazer upload.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        document_type: formData.document_type,
        deal_id: formData.deal_id || null,
        lead_id: formData.lead_id || null,
        unit_id: formData.unit_id || null,
      };

      documentSchema.parse(payload);
      setSaving(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert([
        {
          ...payload,
          broker_id: effectiveBrokerId,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        },
      ]);

      if (dbError) throw dbError;

      toast({
        title: 'Documento enviado!',
        description: 'O documento foi salvo com sucesso.',
      });

      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        document_type: 'other',
        deal_id: '',
        lead_id: '',
        unit_id: '',
      });
      setFile(null);
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao enviar documento',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>Envie um documento e vincule a leads, deals ou unidades</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo *</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <Button variant="outline" className="w-full" type="button" asChild>
                  <span className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {file ? file.name : 'Selecionar arquivo'}
                  </span>
                </Button>
                <input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Máximo 20MB. Formatos: PDF, DOC, DOCX, TXT, JPG, PNG
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome do documento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de Documento *</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value: any) => setFormData({ ...formData, document_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="client_doc">Documento do Cliente</SelectItem>
                <SelectItem value="property_doc">Documento do Imóvel</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Adicione uma descrição..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead_id">Vincular ao Lead (opcional)</Label>
              <Select
                value={formData.lead_id}
                onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_id">Vincular à Unidade (opcional)</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.property?.name 
                        ? `${unit.property.name} - Unidade ${unit.unit_number}` 
                        : `Imóvel Avulso - ${unit.unit_number}${unit.address ? ` (${unit.address})` : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
