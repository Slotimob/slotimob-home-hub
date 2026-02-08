import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCepSearch } from '@/hooks/useCepSearch';
import { CONTACT_CATEGORIES, ContactCategory, CATEGORY_ICONS } from './ContactCategoryFilter';
import { UnifiedContact } from './ContactCard';

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: UnifiedContact | null;
  onSuccess: () => void;
}

const INITIAL_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  document_type: 'CPF',
  document_number: '',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  postal_code: '',
  notes: '',
  categories: [] as ContactCategory[],
  budget_min: '',
  budget_max: '',
  origin: '',
  website: '',
  contact_person: '',
};

export const EditContactDialog = ({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: EditContactDialogProps) => {
  const { toast } = useToast();
  const { searchCepData, isLoadingCep } = useCepSearch();
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  
  // Track which contact ID was last loaded to prevent re-loading same data
  const lastLoadedIdRef = useRef<string | null>(null);

  // RULE 2: Reset form ONLY when dialog opens with a NEW contact
  // Shielded: only runs when open is true to prevent updates while closed
  useEffect(() => {
    // Shield: do not execute anything if dialog is closed
    if (!open) {
      return;
    }
    
    // Only load if we have contact data and it's different from what we loaded
    if (contact && contact.id !== lastLoadedIdRef.current) {
      const metadata = contact.metadata || {};
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        whatsapp: contact.whatsapp || '',
        document_type: contact.document_type || 'CPF',
        document_number: contact.document_number || '',
        address: contact.address || '',
        neighborhood: contact.neighborhood || '',
        city: contact.city || '',
        state: contact.state || '',
        postal_code: contact.postal_code || '',
        notes: contact.notes || '',
        categories: (contact.categories || []) as ContactCategory[],
        budget_min: metadata.budget_min?.toString() || '',
        budget_max: metadata.budget_max?.toString() || '',
        origin: metadata.origin || '',
        website: metadata.website || '',
        contact_person: metadata.contact_person || '',
      });
      lastLoadedIdRef.current = contact.id;
    }
  }, [open, contact?.id]); // Only depend on primitives
  
  // Separate effect to reset tracker when dialog closes
  // This runs AFTER the shielded effect, ensuring clean state for next open
  useEffect(() => {
    if (!open) {
      lastLoadedIdRef.current = null;
    }
  }, [open]);

  const handleCepBlur = async () => {
    if (formData.postal_code.length >= 8) {
      const result = await searchCepData(formData.postal_code);
      if (result) {
        setFormData(prev => ({
          ...prev,
          address: result.address || prev.address,
          neighborhood: result.neighborhood || prev.neighborhood,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
      }
    }
  };

  const handleCategoryToggle = (category: ContactCategory) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !formData.name.trim() || formData.categories.length === 0) {
      toast({ 
        title: 'Preencha os campos obrigatórios', 
        description: 'Nome e pelo menos uma categoria são obrigatórios',
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    try {
      // Build metadata based on categories
      const metadata: Record<string, any> = { ...(contact.metadata || {}) };
      
      if (formData.categories.includes('Lead')) {
        metadata.budget_min = formData.budget_min ? parseFloat(formData.budget_min) : null;
        metadata.budget_max = formData.budget_max ? parseFloat(formData.budget_max) : null;
        metadata.origin = formData.origin || null;
      }
      
      if (formData.categories.includes('Empresa')) {
        metadata.website = formData.website || null;
        metadata.contact_person = formData.contact_person || null;
      }

      const { error } = await supabase
        .from('contacts')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          whatsapp: formData.whatsapp.trim() || null,
          document_type: formData.document_type || null,
          document_number: formData.document_number.trim() || null,
          address: formData.address.trim() || null,
          neighborhood: formData.neighborhood.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          notes: formData.notes.trim() || null,
          categories: formData.categories,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast({ title: 'Contato atualizado com sucesso!' });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar contato', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isLead = formData.categories.includes('Lead');
  const isEmpresa = formData.categories.includes('Empresa');

  // RULE 1: Dialog is ALWAYS rendered - content shows based on contact existence
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
          <DialogDescription>Altere os dados do contato abaixo.</DialogDescription>
        </DialogHeader>
        
        {/* Show form only if we have contact data */}
        {contact ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Categories Selection */}
            <div className="space-y-2">
              <Label>Categorias *</Label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category];
                  const isSelected = formData.categories.includes(category);
                  return (
                    <button
                      type="button"
                      key={category}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-input hover:border-primary/50'
                      }`}
                      onClick={() => handleCategoryToggle(category)}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                        {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="Se diferente do telefone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select
                  value={formData.document_type || 'CPF'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, document_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="RG">RG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Número do Documento</Label>
                <Input
                  value={formData.document_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                  onBlur={handleCepBlur}
                  disabled={isLoadingCep}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={formData.neighborhood}
                  onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  maxLength={2}
                />
              </div>
            </div>

            {/* Lead-specific fields - use key to ensure stable mounting */}
            {isLead && (
              <div key="lead-fields" className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium text-sm text-muted-foreground">Dados de Lead</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Orçamento Mínimo</Label>
                    <Input
                      type="number"
                      value={formData.budget_min}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Orçamento Máximo</Label>
                    <Input
                      type="number"
                      value={formData.budget_max}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select
                    value={formData.origin || 'none'}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, origin: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione a origem</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="portal">Portal</SelectItem>
                      <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Company-specific fields - use key to ensure stable mounting */}
            {isEmpresa && (
              <div key="empresa-fields" className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium text-sm text-muted-foreground">Dados da Empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pessoa de Contato</Label>
                    <Input
                      value={formData.contact_person}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum contato selecionado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
