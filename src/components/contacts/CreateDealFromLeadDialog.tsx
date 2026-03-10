import { useState, useEffect, useMemo } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateDealFromLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { id: string; name: string } | null;
  onSuccess: () => void;
}

export const CreateDealFromLeadDialog = ({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: CreateDealFromLeadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<{ id: string; name: string; city?: string | null }[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');

  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    estimated_value: '',
    estimated_commission: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadProperties();
      setFormData({
        property_id: '',
        unit_id: '',
        estimated_value: '',
        estimated_commission: '',
        notes: '',
      });
    }
  }, [open]);

  useEffect(() => {
    if (formData.property_id) {
      loadUnits(formData.property_id);
    } else {
      setUnits([]);
    }
  }, [formData.property_id]);

  const loadProperties = async () => {
    const { data } = await supabase.from('properties').select('id, name, city').order('name');
    setProperties(data || []);
  };

  const loadUnits = async (propertyId: string) => {
    const { data } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('property_id', propertyId)
      .eq('status', 'available')
      .order('unit_number');
    setUnits(data || []);
  };

  const filteredProperties = useMemo(() => {
    if (!propertySearch) return properties;
    const searchLower = propertySearch.toLowerCase();
    return properties.filter(property =>
      property.name.toLowerCase().includes(searchLower) ||
      property.city?.toLowerCase().includes(searchLower)
    );
  }, [properties, propertySearch]);

  const selectedProperty = properties.find(p => p.id === formData.property_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lead || !formData.property_id) {
      toast({
        title: 'Erro',
        description: 'Selecione um empreendimento.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('deals').insert([{
        lead_id: lead.id,
        property_id: formData.property_id,
        unit_id: formData.unit_id || null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        estimated_commission: formData.estimated_commission ? parseFloat(formData.estimated_commission) : null,
        notes: formData.notes || null,
        broker_id: effectiveBrokerId,
        stage: 'new_lead',
      }]);

      if (error) throw error;

      toast({
        title: 'Deal criado!',
        description: `Novo deal criado para ${lead.name}.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar deal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Deal para Lead</DialogTitle>
          <DialogDescription>
            Vincular <strong>{lead?.name}</strong> a uma negociação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Selection */}
          <div className="space-y-2">
            <Label>Empreendimento *</Label>
            <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={propertyOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedProperty ? (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {selectedProperty.name}
                    </span>
                  ) : (
                    'Selecione um empreendimento...'
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar empreendimento..."
                    value={propertySearch}
                    onValueChange={setPropertySearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum empreendimento encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredProperties.map((property) => (
                        <CommandItem
                          key={property.id}
                          value={property.id}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, property_id: property.id, unit_id: '' }));
                            setPropertyOpen(false);
                            setPropertySearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.property_id === property.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{property.name}</span>
                            {property.city && (
                              <span className="text-xs text-muted-foreground">{property.city}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Unit Selection */}
          {units.length > 0 && (
            <div className="space-y-2">
              <Label>Unidade (opcional)</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value and Commission */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor Estimado (R$)</Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Comissão Estimada (R$)</Label>
              <Input
                type="number"
                value={formData.estimated_commission}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_commission: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas sobre o deal..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !formData.property_id}>
              {saving ? 'Criando...' : 'Criar Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
