import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CreatePropertyQuickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertyCreated: (property: { id: string; name: string }) => void;
}

export function CreatePropertyQuickDialog({
  open,
  onOpenChange,
  onPropertyCreated,
}: CreatePropertyQuickDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do empreendimento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('properties')
        .insert([
          {
            name: name.trim(),
            city: city.trim() || null,
            broker_id: effectiveBrokerId,
          },
        ])
        .select('id, name')
        .single();

      if (error) throw error;

      toast({
        title: 'Empreendimento criado!',
        description: 'O empreendimento foi cadastrado com sucesso.',
      });

      onPropertyCreated(data);
      onOpenChange(false);
      setName('');
      setCity('');
    } catch (error: any) {
      toast({
        title: 'Erro ao criar empreendimento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle>Novo Empreendimento</DialogTitle>
          <DialogDescription>
            Cadastre rapidamente um novo empreendimento para vincular à unidade
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="property-name">Nome do Empreendimento *</Label>
            <Input
              id="property-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Residencial Vista Mar"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-city">Cidade</Label>
            <Input
              id="property-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: São Paulo"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Criando...' : 'Criar Empreendimento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
