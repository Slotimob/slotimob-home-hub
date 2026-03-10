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
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { UnitImageUpload } from '@/components/UnitImageUpload';
import { ContactSelector } from '@/components/ContactSelector';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_UNIT_STATUSES, getStatusLabel } from '@/utils/uiConstants';

type UnitStatus = Database['public']['Enums']['unit_status'];

interface Property {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

const unitSchema = z.object({
  property_id: z.string().uuid('Selecione um empreendimento'),
  unit_number: z.string().min(1, 'Número da unidade é obrigatório').max(50),
  status: z.enum(['available', 'reserved', 'rented', 'sold']),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero').optional().nullable(),
  area: z.number().min(0, 'Área deve ser maior ou igual a zero').optional().nullable(),
  bedrooms: z.number().int().min(0, 'Quartos deve ser >= 0').optional().nullable(),
  bathrooms: z.number().int().min(0, 'Banheiros deve ser >= 0').optional().nullable(),
  condo_fee: z.number().min(0, 'Condomínio deve ser >= 0').optional().nullable(),
  cover_image_url: z.string().url().optional().nullable(),
});

interface CreateUnitWithPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateUnitWithPropertyDialog = ({ open, onOpenChange, onSuccess }: CreateUnitWithPropertyDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyPopoverOpen, setPropertyPopoverOpen] = useState(false);

  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    status: 'available' as UnitStatus,
    price: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    condo_fee: '',
    cover_image_url: '' as string | null,
    lead_id: null as string | null,
  });

  useEffect(() => {
    if (open && user) {
      loadProperties();
    }
  }, [open, user]);

  const loadProperties = async () => {
    setLoadingProperties(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, city, state')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar empreendimentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingProperties(false);
    }
  };

  const filteredProperties = properties.filter((property) =>
    property.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
    property.city?.toLowerCase().includes(propertySearch.toLowerCase()) ||
    property.state?.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const selectedProperty = properties.find((p) => p.id === formData.property_id);

  const resetForm = () => {
    setFormData({
      property_id: '',
      unit_number: '',
      status: 'available',
      price: '',
      area: '',
      bedrooms: '',
      bathrooms: '',
      condo_fee: '',
      cover_image_url: null,
      lead_id: null,
    });
    setPropertySearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        property_id: formData.property_id,
        unit_number: formData.unit_number.trim(),
        status: formData.status,
        price: formData.price ? parseFloat(formData.price) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        condo_fee: formData.condo_fee ? parseFloat(formData.condo_fee) : null,
        cover_image_url: formData.cover_image_url || null,
      };

      unitSchema.parse(payload);
      setSaving(true);

      const { error } = await supabase.from('units').insert([
        {
          ...payload,
          broker_id: effectiveBrokerId,
          lead_id: formData.lead_id || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Unidade criada!',
        description: 'A unidade foi cadastrada com sucesso.',
      });

      onOpenChange(false);
      resetForm();
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
          title: 'Erro ao criar unidade',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Unidade</DialogTitle>
          <DialogDescription>Cadastre uma nova unidade vinculada a um empreendimento</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Selection */}
          <div className="space-y-2">
            <Label>Empreendimento *</Label>
            <Popover open={propertyPopoverOpen} onOpenChange={setPropertyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={propertyPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedProperty ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{selectedProperty.name}</span>
                      {selectedProperty.city && (
                        <span className="text-muted-foreground text-sm">
                          - {selectedProperty.city}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Selecione um empreendimento...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar empreendimento..."
                    value={propertySearch}
                    onValueChange={setPropertySearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {loadingProperties ? 'Carregando...' : 'Nenhum empreendimento encontrado.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredProperties.map((property) => (
                        <CommandItem
                          key={property.id}
                          value={property.id}
                          onSelect={() => {
                            setFormData({ ...formData, property_id: property.id });
                            setPropertyPopoverOpen(false);
                            setPropertySearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              formData.property_id === property.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{property.name}</span>
                            {property.city && (
                              <span className="text-xs text-muted-foreground">
                                {property.city}{property.state ? `, ${property.state}` : ''}
                              </span>
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

          <UnitImageUpload
            currentImageUrl={formData.cover_image_url}
            onImageUploaded={(url) => setFormData({ ...formData, cover_image_url: url })}
            onImageRemoved={() => setFormData({ ...formData, cover_image_url: null })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unit_number">Número da Unidade *</Label>
              <Input
                id="unit_number"
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                placeholder="Ex: 101, 102A, Torre 1 - 501"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: UnitStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_UNIT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área (m²)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Quartos</Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Banheiros</Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condo_fee">Condomínio (R$)</Label>
            <Input
              id="condo_fee"
              type="number"
              step="0.01"
              value={formData.condo_fee}
              onChange={(e) => setFormData({ ...formData, condo_fee: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Contato Vinculado</Label>
            <ContactSelector 
              value={formData.lead_id} 
              onChange={(v) => setFormData({ ...formData, lead_id: v })} 
              placeholder="Buscar contato..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !formData.property_id}>
              {saving ? 'Criando...' : 'Criar Unidade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
