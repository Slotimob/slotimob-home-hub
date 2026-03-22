import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useCepSearch } from '@/hooks/useCepSearch';
import { CONTACT_CATEGORIES, ContactCategory, CATEGORY_ICONS } from './ContactCategoryFilter';
import { Loader2 } from 'lucide-react';

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newContact?: any) => void;
  defaultCategory?: ContactCategory;
  initialPhone?: string;
}

// Format helpers for automation-ready data
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatCEP = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

// Extract clean digits for storage
const cleanPhone = (value: string): string => value.replace(/\D/g, '');
const cleanDocument = (value: string): string => value.replace(/\D/g, '');
const cleanCEP = (value: string): string => value.replace(/\D/g, '');

// Email validation
const isValidEmail = (email: string): boolean => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const CreateContactDialog = ({
  open,
  onOpenChange,
  onSuccess,
  defaultCategory,
  initialPhone,
}: CreateContactDialogProps) => {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const { searchCepData, isLoadingCep } = useCepSearch();
  const queryClient = useQueryClient();
  
  const [saving, setSaving] = useState(false);
  
  // Initial form state - does NOT depend on props to avoid render loops
  const getInitialFormData = useCallback(() => ({
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
    interest_type: [] as string[],
    website: '',
    contact_person: '',
  }), []);
  
  const [formData, setFormData] = useState(getInitialFormData);
  
  // Track the last defaultCategory we applied to avoid re-applying on prop changes
  const appliedDefaultRef = useRef<ContactCategory | null>(null);
  const wasOpenRef = useRef(false);
  
  useEffect(() => {
    // Only act when dialog OPENS (transition from closed to open)
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    
    if (justOpened) {
      // Reset form when dialog opens
      setFormData(getInitialFormData());
      appliedDefaultRef.current = null;
      
      // Apply initialPhone if provided
      if (initialPhone) {
        const digits = initialPhone.replace(/\D/g, '');
        setFormData(prev => ({
          ...prev,
          phone: formatPhone(digits),
          whatsapp: formatPhone(digits),
        }));
      }
      
      // Apply defaultCategory if provided
      if (defaultCategory) {
        setFormData(prev => ({
          ...prev,
          categories: [defaultCategory],
        }));
        appliedDefaultRef.current = defaultCategory;
      }
    }
  }, [open, defaultCategory, getInitialFormData]);

  const handleCepChange = (value: string) => {
    const formatted = formatCEP(value);
    setFormData(prev => ({ ...prev, postal_code: formatted }));
  };

  const handleCepBlur = async () => {
    const cleanedCep = cleanCEP(formData.postal_code);
    if (cleanedCep.length === 8) {
      const result = await searchCepData(cleanedCep);
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

  const handlePhoneChange = (field: 'phone' | 'whatsapp', value: string) => {
    const formatted = formatPhone(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleDocumentChange = (value: string) => {
    const formatter = formData.document_type === 'CNPJ' ? formatCNPJ : formatCPF;
    setFormData(prev => ({ ...prev, document_number: formatter(value) }));
  };

  const handleDocumentTypeChange = (type: string) => {
    // Reset document when type changes
    setFormData(prev => ({ 
      ...prev, 
      document_type: type,
      document_number: '' 
    }));
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
    if (!user || !formData.name.trim() || formData.categories.length === 0) {
      toast({ 
        title: 'Preencha os campos obrigatórios', 
        description: 'Nome e pelo menos uma categoria são obrigatórios',
        variant: 'destructive' 
      });
      return;
    }

    // Validate email format
    if (formData.email && !isValidEmail(formData.email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Build metadata based on categories
      const metadata: Record<string, any> = {};
      
      if (formData.categories.includes('Lead')) {
        if (formData.budget_min) metadata.budget_min = parseFloat(formData.budget_min);
        if (formData.budget_max) metadata.budget_max = parseFloat(formData.budget_max);
        if (formData.origin) metadata.origin = formData.origin;
        if (formData.interest_type.length > 0) metadata.interest_type = formData.interest_type;
      }
      
      if (formData.categories.includes('Empresa')) {
        if (formData.website) metadata.website = formData.website;
        if (formData.contact_person) metadata.contact_person = formData.contact_person;
      }

      // Store clean values for automation compatibility
      const cleanPhoneValue = cleanPhone(formData.phone);
      const cleanWhatsappValue = cleanPhone(formData.whatsapp);
      
      // Inject both broker_id (organization) and assigned_user_id (individual user)
      const { data, error } = await supabase.from('contacts').insert({
        broker_id: effectiveBrokerId,
        assigned_user_id: user.id, // Auto-inject: user who created this contact
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase() || null,
        phone: cleanPhoneValue || null,
        whatsapp: cleanWhatsappValue || cleanPhoneValue || null,
        document_type: formData.document_type || null,
        document_number: cleanDocument(formData.document_number) || null,
        address: formData.address.trim() || null,
        neighborhood: formData.neighborhood.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim().toUpperCase() || null,
        postal_code: cleanCEP(formData.postal_code) || null,
        notes: formData.notes.trim() || null,
        categories: formData.categories,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      }).select().single();

      if (error) throw error;

      // Invalidate all relevant caches so panels update reactively
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-chats'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      toast({ title: 'Contato criado com sucesso!' });
      onSuccess(data);
      onOpenChange(false);
      // Form will be reset when dialog reopens via the useEffect
    } catch (error: any) {
      toast({ title: 'Erro ao criar contato', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isLead = formData.categories.includes('Lead');
  const isEmpresa = formData.categories.includes('Empresa');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
          <DialogDescription>Preencha os dados do novo contato abaixo.</DialogDescription>
        </DialogHeader>
        
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome / Razão Social *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo ou razão social"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className={formData.email && !isValidEmail(formData.email) ? 'border-destructive' : ''}
              />
              {formData.email && !isValidEmail(formData.email) && (
                <p className="text-xs text-destructive">Email inválido</p>
              )}
            </div>
          </div>

          {/* Phone fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handlePhoneChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground">Se não informado, será usado o telefone</p>
            </div>
          </div>

          {/* Document */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select
                value={formData.document_type}
                onValueChange={handleDocumentTypeChange}
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="document_number">Número do Documento</Label>
              <Input
                id="document_number"
                value={formData.document_number}
                onChange={(e) => handleDocumentChange(e.target.value)}
                placeholder={formData.document_type === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">CEP</Label>
              <div className="relative">
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  inputMode="numeric"
                  disabled={isLoadingCep}
                />
                {isLoadingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Rua, número, complemento"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                maxLength={2}
                placeholder="UF"
              />
            </div>
          </div>

          {/* Lead-specific fields - use key to ensure stable mounting */}
          {isLead && (
            <div key="lead-fields" className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm text-muted-foreground">Dados de Lead</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Orçamento Mínimo</Label>
                  <Input
                    type="number"
                    value={formData.budget_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orçamento Máximo</Label>
                  <Input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                    placeholder="R$ 0,00"
                    inputMode="decimal"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://exemplo.com.br"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pessoa de Contato</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Informações adicionais sobre o contato..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Criar Contato'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
