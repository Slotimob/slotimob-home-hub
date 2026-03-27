import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AgentSelector } from '@/components/shared/AgentSelector';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
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
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Plus, ChevronUp, UserPlus, Building2, Home, Check, ChevronsUpDown, Calculator, CalendarIcon, Thermometer, Flame, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dealSchema = z.object({
  lead_id: z.string().uuid('Selecione um lead válido'),
  unit_id: z.string().uuid('Selecione uma unidade ou imóvel').optional().nullable(),
  estimated_value: z.number().min(0, 'Valor deve ser maior ou igual a zero').optional().nullable(),
  estimated_commission: z.number().min(0, 'Comissão deve ser maior ou igual a zero').optional().nullable(),
  notes: z.string().nullish(),
  temperature: z.enum(['hot', 'warm', 'cold']).optional(),
  business_type: z.enum(['sale', 'rental']).optional(),
  expected_close_date: z.date().optional().nullable(),
  initial_task: z.string().nullish(),
});

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().trim().email('Email inválido').max(255).optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Telefone deve ter no máximo 20 caracteres').optional().or(z.literal('')),
  origin: z.string().optional(),
});

interface UnitOption {
  id: string;
  unit_number: string;
  is_standalone: boolean;
  property_name: string | null;
  city: string | null;
  price: number | null;
}

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pipelineType?: string;
}

export const CreateDealDialog = ({ open, onOpenChange, onSuccess, pipelineType = 'sale' }: CreateDealDialogProps) => {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [leads, setLeads] = useState<{ id: string; name: string; email?: string | null; phone?: string | null }[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [unitType, setUnitType] = useState<'all' | 'units' | 'standalone'>('all');
  const [dateOpen, setDateOpen] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [selectedPipeline, setSelectedPipeline] = useState(pipelineType);

  const PIPELINE_OPTIONS = [
    { value: 'sale', label: '🏷️ Vendas' },
    { value: 'rental', label: '🏠 Locações' },
    { value: 'acquisition', label: '📋 Captações' },
  ];

  const [formData, setFormData] = useState({
    lead_id: '',
    unit_id: '',
    estimated_value: '',
    estimated_commission: '',
    notes: '',
    temperature: 'warm' as 'hot' | 'warm' | 'cold',
    business_type: 'sale' as 'sale' | 'rental',
    expected_close_date: undefined as Date | undefined,
    initial_task: '',
  });

  const [newLeadData, setNewLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    origin: '',
  });

  useEffect(() => {
    if (open) {
      loadLeads();
      loadUnits();
      setShowNewLeadForm(false);
      setNewLeadData({ name: '', email: '', phone: '', origin: '' });
      setLeadSearch('');
      setUnitSearch('');
      setFormData({
        lead_id: '',
        unit_id: '',
        estimated_value: '',
        estimated_commission: '',
        notes: '',
        temperature: 'warm',
        business_type: 'sale',
        expected_close_date: undefined,
        initial_task: '',
      });
    }
  }, [open]);

  // Auto-fill estimated value when unit is selected
  useEffect(() => {
    if (formData.unit_id) {
      const selectedUnit = units.find(u => u.id === formData.unit_id);
      if (selectedUnit?.price && !formData.estimated_value) {
        setFormData(prev => ({ ...prev, estimated_value: selectedUnit.price?.toString() || '' }));
      }
    }
  }, [formData.unit_id, units]);

  const loadLeads = async () => {
    const { data } = await supabase.from('leads').select('id, name, email, phone').order('name');
    setLeads(data || []);
  };

  const loadUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        is_standalone,
        city,
        price,
        property:properties(name)
      `)
      .eq('status', 'available')
      .order('unit_number');

    if (data) {
      setUnits(data.map(unit => ({
        id: unit.id,
        unit_number: unit.unit_number,
        is_standalone: unit.is_standalone || false,
        property_name: unit.property?.name || null,
        city: unit.city,
        price: unit.price,
      })));
    }
  };

  const filteredLeads = useMemo(() => {
    if (!leadSearch) return leads;
    const searchLower = leadSearch.toLowerCase();
    return leads.filter(lead =>
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(leadSearch)
    );
  }, [leads, leadSearch]);

  const filteredUnits = useMemo(() => {
    let filtered = units;
    
    // Filter by type
    if (unitType === 'units') {
      filtered = filtered.filter(u => !u.is_standalone);
    } else if (unitType === 'standalone') {
      filtered = filtered.filter(u => u.is_standalone);
    }

    // Filter by search
    if (unitSearch) {
      const searchLower = unitSearch.toLowerCase();
      filtered = filtered.filter(unit =>
        unit.unit_number.toLowerCase().includes(searchLower) ||
        unit.property_name?.toLowerCase().includes(searchLower) ||
        unit.city?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [units, unitSearch, unitType]);

  const selectedLead = leads.find(l => l.id === formData.lead_id);
  const selectedUnit = units.find(u => u.id === formData.unit_id);

  const handleCreateLead = async () => {
    try {
      const payload = {
        name: newLeadData.name.trim(),
        email: newLeadData.email.trim() || undefined,
        phone: newLeadData.phone.trim() || undefined,
        origin: newLeadData.origin || undefined,
      };

      leadSchema.parse(payload);
      setSavingLead(true);

      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...payload, broker_id: effectiveBrokerId }])
        .select('id, name, email, phone')
        .single();

      if (error) throw error;

      toast({
        title: 'Lead criado!',
        description: `${data.name} foi adicionado à sua lista de leads.`,
      });

      setLeads((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((prev) => ({ ...prev, lead_id: data.id }));
      setShowNewLeadForm(false);
      setNewLeadData({ name: '', email: '', phone: '', origin: '' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar lead',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setSavingLead(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.lead_id) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione um lead.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Get property_id from selected unit if it's not standalone
      let propertyId: string | null = null;
      if (formData.unit_id) {
        const unit = units.find(u => u.id === formData.unit_id);
        if (unit && !unit.is_standalone) {
          // Get property_id from the unit
          const { data: unitData } = await supabase
            .from('units')
            .select('property_id')
            .eq('id', formData.unit_id)
            .single();
          propertyId = unitData?.property_id || null;
        }
      }

      // If no property, create a placeholder or use a default approach
      // For now, we'll require a unit selection that has a property
      if (!propertyId && formData.unit_id) {
        // For standalone units, we still need a property reference
        // The system will use the unit_id directly
      }

      // We need at least a property_id for the deal
      // Let's fetch or create based on unit
      if (!propertyId) {
        // Get or create a default "Avulsos" property
        const { data: defaultProp } = await supabase
          .from('properties')
          .select('id')
          .eq('name', 'Imóveis Avulsos')
          .eq('broker_id', effectiveBrokerId)
          .maybeSingle();

        if (defaultProp) {
          propertyId = defaultProp.id;
        } else {
          const { data: newProp, error: propError } = await supabase
            .from('properties')
            .insert([{ name: 'Imóveis Avulsos', broker_id: effectiveBrokerId }])
            .select('id')
            .single();
          
          if (propError) throw propError;
          propertyId = newProp.id;
        }
      }

      const dealPayload = {
        lead_id: formData.lead_id,
        property_id: propertyId!,
        unit_id: formData.unit_id || null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        estimated_commission: formData.estimated_commission ? parseFloat(formData.estimated_commission) : null,
        notes: formData.notes || null,
        temperature: formData.temperature,
        business_type: formData.business_type,
        expected_close_date: formData.expected_close_date ? format(formData.expected_close_date, 'yyyy-MM-dd') : null,
        initial_task: formData.initial_task || null,
        broker_id: effectiveBrokerId,
        assigned_user_id: assignedUserId || user?.id || null,
        stage: 'new_lead' as const,
        pipeline_type: pipelineType,
      };

      const { data: newDeal, error } = await supabase.from('deals').insert([dealPayload]).select('id').single();

      if (error) throw error;

      // Create initial task if provided
      if (formData.initial_task && newDeal) {
        await supabase.from('deal_tasks').insert([{
          deal_id: newDeal.id,
          broker_id: effectiveBrokerId,
          title: formData.initial_task,
          priority: 'high',
        }]);
      }

      toast({
        title: 'Negociação criada!',
        description: 'A negociação foi adicionada ao pipeline.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar negociação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const originOptions = [
    { value: 'website', label: 'Site' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'portal', label: 'Portal Imobiliário' },
    { value: 'zap', label: 'ZAP Imóveis' },
    { value: 'olx', label: 'OLX' },
    { value: 'vivareal', label: 'VivaReal' },
    { value: 'referral', label: 'Indicação' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'walk_in', label: 'Presencial' },
    { value: 'phone', label: 'Telefone' },
    { value: 'other', label: 'Outro' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Nova Negociação</DialogTitle>
          <DialogDescription>Adicione uma nova negociação ao pipeline de vendas</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ========== GRUPO 1: CLIENTE ========== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              <span>Cliente</span>
            </div>
            
            {/* Lead Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="lead_id">Lead *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewLeadForm(!showNewLeadForm)}
                  className="h-7 text-xs"
                >
                  {showNewLeadForm ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Cancelar
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Novo Lead
                    </>
                  )}
                </Button>
              </div>

              {/* New Lead Form */}
              <Collapsible open={showNewLeadForm} onOpenChange={setShowNewLeadForm}>
                <CollapsibleContent className="pt-2">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3 mb-2">
                    <div className="space-y-2">
                      <Label htmlFor="new_lead_name" className="text-xs">Nome *</Label>
                      <Input
                        id="new_lead_name"
                        value={newLeadData.name}
                        onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                        placeholder="Nome do lead"
                        maxLength={100}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="new_lead_phone" className="text-xs">Telefone</Label>
                        <Input
                          id="new_lead_phone"
                          value={newLeadData.phone}
                          onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                          maxLength={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_lead_email" className="text-xs">Email</Label>
                        <Input
                          id="new_lead_email"
                          type="email"
                          value={newLeadData.email}
                          onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          maxLength={255}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_lead_origin" className="text-xs">Origem do Lead</Label>
                      <Select
                        value={newLeadData.origin}
                        onValueChange={(value) => setNewLeadData({ ...newLeadData, origin: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                        <SelectContent>
                          {originOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewLeadForm(false);
                          setNewLeadData({ name: '', email: '', phone: '', origin: '' });
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateLead}
                        disabled={savingLead || !newLeadData.name.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {savingLead ? 'Criando...' : 'Criar Lead'}
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Searchable Lead Select */}
              <Popover open={leadOpen} onOpenChange={setLeadOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={leadOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedLead ? selectedLead.name : 'Selecione um lead...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar lead..."
                      value={leadSearch}
                      onValueChange={setLeadSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                      <CommandGroup>
                        {filteredLeads.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={lead.id}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, lead_id: lead.id }));
                              setLeadOpen(false);
                              setLeadSearch('');
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.lead_id === lead.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{lead.name}</span>
                              {(lead.email || lead.phone) && (
                                <span className="text-xs text-muted-foreground">
                                  {lead.phone || lead.email}
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
          </div>

          <Separator />

          {/* ========== GRUPO 2: IMÓVEL ========== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Imóvel</span>
            </div>

            {/* Business Type */}
            <div className="space-y-2">
              <Label>Tipo de Negócio</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.business_type === 'sale' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, business_type: 'sale' }))}
                  className="flex-1"
                >
                  Venda
                </Button>
                <Button
                  type="button"
                  variant={formData.business_type === 'rental' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, business_type: 'rental' }))}
                  className="flex-1"
                >
                  Locação
                </Button>
              </div>
            </div>

            {/* Unit Type Filter */}
            <div className="space-y-2">
              <Label>Tipo de Imóvel</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={unitType === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setUnitType('all')}
                  className="text-xs"
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  variant={unitType === 'units' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setUnitType('units')}
                  className="text-xs gap-1"
                >
                  <Building2 className="h-3 w-3" />
                  Unidades
                </Button>
                <Button
                  type="button"
                  variant={unitType === 'standalone' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setUnitType('standalone')}
                  className="text-xs gap-1"
                >
                  <Home className="h-3 w-3" />
                  Avulsos
                </Button>
              </div>
            </div>

            {/* Unit Selection */}
            <div className="space-y-2">
              <Label>Unidade / Imóvel</Label>
              <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unitOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedUnit ? (
                      <div className="flex items-center gap-2 truncate">
                        {selectedUnit.is_standalone ? (
                          <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{selectedUnit.unit_number}</span>
                        {selectedUnit.property_name && (
                          <span className="text-muted-foreground text-xs truncate">
                            ({selectedUnit.property_name})
                          </span>
                        )}
                      </div>
                    ) : (
                      'Selecione uma unidade ou imóvel...'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar unidade..."
                      value={unitSearch}
                      onValueChange={setUnitSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__clear__"
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, unit_id: '' }));
                            setUnitOpen(false);
                          }}
                        >
                          <span className="text-muted-foreground">Nenhum (Limpar)</span>
                        </CommandItem>
                        {filteredUnits.map((unit) => (
                          <CommandItem
                            key={unit.id}
                            value={`${unit.unit_number} ${unit.property_name || ''} ${unit.city || ''}`}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, unit_id: unit.id }));
                              setUnitOpen(false);
                              setUnitSearch('');
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.unit_id === unit.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              {unit.is_standalone ? (
                                <Home className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="flex flex-col">
                                <span>{unit.unit_number}</span>
                                <span className="text-xs text-muted-foreground">
                                  {unit.property_name || (unit.is_standalone ? 'Imóvel Avulso' : '')}
                                  {unit.city && ` • ${unit.city}`}
                                </span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* ========== GRUPO 3: OPORTUNIDADE ========== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Thermometer className="h-4 w-4" />
              <span>Oportunidade</span>
            </div>

            {/* Value and Commission */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Valor do Negócio (R$)</Label>
                <CurrencyInput
                  id="estimated_value"
                  value={formData.estimated_value}
                  onChange={(value) => setFormData({ ...formData, estimated_value: value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_commission">Comissão (R$)</Label>
                <CurrencyInput
                  id="estimated_commission"
                  value={formData.estimated_commission}
                  onChange={(value) => setFormData({ ...formData, estimated_commission: value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label>Temperatura do Lead</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.temperature === 'cold' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, temperature: 'cold' }))}
                  className={cn(
                    "flex-1 gap-1",
                    formData.temperature === 'cold' && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Snowflake className="h-3 w-3" />
                  Frio
                </Button>
                <Button
                  type="button"
                  variant={formData.temperature === 'warm' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, temperature: 'warm' }))}
                  className={cn(
                    "flex-1 gap-1",
                    formData.temperature === 'warm' && "bg-amber-500 hover:bg-amber-600"
                  )}
                >
                  <Thermometer className="h-3 w-3" />
                  Morno
                </Button>
                <Button
                  type="button"
                  variant={formData.temperature === 'hot' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, temperature: 'hot' }))}
                  className={cn(
                    "flex-1 gap-1",
                    formData.temperature === 'hot' && "bg-green-600 hover:bg-green-700"
                  )}
                >
                  <Flame className="h-3 w-3" />
                  Quente
                </Button>
              </div>
            </div>

            {/* Expected Close Date */}
            <div className="space-y-2">
              <Label>Data Prevista de Fechamento</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.expected_close_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expected_close_date ? (
                      format(formData.expected_close_date, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      'Selecione uma data'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expected_close_date}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, expected_close_date: date }));
                      setDateOpen(false);
                    }}
                    locale={ptBR}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* ========== GRUPO: RESPONSÁVEL (Equipes) ========== */}
          <AgentSelector
            value={assignedUserId}
            onValueChange={setAssignedUserId}
          />

          <Separator />

          {/* ========== GRUPO 4: PRÓXIMO PASSO ========== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>Próximo Passo</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial_task">Primeira Ação</Label>
              <Input
                id="initial_task"
                value={formData.initial_task}
                onChange={(e) => setFormData({ ...formData, initial_task: e.target.value })}
                placeholder="Ex: Ligar para agendar visita, Enviar proposta..."
              />
              <p className="text-xs text-muted-foreground">
                Descreva a próxima ação a ser tomada com este lead
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais sobre o negócio..."
                rows={2}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !formData.lead_id}>
              {saving ? 'Criando...' : 'Criar Negociação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
