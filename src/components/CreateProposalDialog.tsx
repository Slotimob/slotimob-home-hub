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
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateProposalDialog = ({ open, onOpenChange, onSuccess }: CreateProposalDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string; property: { name: string }; price: number | null }[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    lead_id: '',
    unit_id: '',
    price: '',
    observations: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const [leadsRes, unitsRes] = await Promise.all([
      supabase.from('leads').select('id, name').order('name'),
      supabase.from('units').select('id, unit_number, price, property:properties(name)').eq('status', 'available').order('unit_number'),
    ]);

    setLeads(leadsRes.data || []);
    setUnits(unitsRes.data || []);
  };

  const generateProposal = (leadName: string, unitInfo: string, price: string, observations: string) => {
    const today = new Date().toLocaleDateString('pt-BR');
    return `
PROPOSTA COMERCIAL

Data: ${today}

Cliente: ${leadName}
Imóvel: ${unitInfo}
Valor: R$ ${price}

CONDIÇÕES:
- Entrada: A combinar
- Financiamento: Disponível
- IPTU e Condomínio: Por conta do comprador

OBSERVAÇÕES:
${observations || 'Nenhuma observação adicional'}

VALIDADE:
Esta proposta tem validade de 7 dias.

_______________________________
Assinatura do Corretor
`.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.lead_id || !formData.unit_id || !formData.price) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const lead = leads.find((l) => l.id === formData.lead_id);
      const unit = units.find((u) => u.id === formData.unit_id);

      if (!lead || !unit) throw new Error('Lead ou unidade não encontrada');

      const proposalContent = generateProposal(
        lead.name,
        `${unit.property.name} - Unidade ${unit.unit_number}`,
        formData.price,
        formData.observations
      );

      // Create text file
      const blob = new Blob([proposalContent], { type: 'text/plain' });
      const fileName = `${Date.now()}-proposta-${lead.name.replace(/\s+/g, '-')}.txt`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert([
        {
          broker_id: user?.id,
          lead_id: formData.lead_id,
          unit_id: formData.unit_id,
          document_type: 'proposal',
          title: formData.title || `Proposta - ${lead.name}`,
          description: `Proposta para ${unit.property.name} - Unidade ${unit.unit_number}`,
          file_path: filePath,
          file_size: blob.size,
          mime_type: 'text/plain',
        },
      ]);

      if (dbError) throw dbError;

      toast({
        title: 'Proposta criada!',
        description: 'A proposta foi gerada e salva com sucesso.',
      });

      onOpenChange(false);
      setFormData({
        title: '',
        lead_id: '',
        unit_id: '',
        price: '',
        observations: '',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar proposta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedUnit = units.find((u) => u.id === formData.unit_id);

  useEffect(() => {
    if (selectedUnit?.price && !formData.price) {
      setFormData((prev) => ({ ...prev, price: selectedUnit.price.toString() }));
    }
  }, [selectedUnit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Proposta Comercial</DialogTitle>
          <DialogDescription>Gere uma proposta digital para enviar ao cliente</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome da proposta (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead_id">Cliente *</Label>
            <Select
              value={formData.lead_id}
              onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
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
            <Label htmlFor="unit_id">Unidade *</Label>
            <Select
              value={formData.unit_id}
              onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.property.name} - Unidade {unit.unit_number}
                    {unit.price && ` (R$ ${unit.price.toLocaleString('pt-BR')})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Valor da Proposta (R$) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Adicione observações sobre a proposta..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Proposta
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
