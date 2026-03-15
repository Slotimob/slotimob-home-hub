import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { showError } from '@/utils/notifications';
import { z } from 'zod';
import { HelpCircle, Percent, Trash2, Info, Sparkles, Image, FileText, Loader2, Target, Settings2 } from 'lucide-react';
import { AssetImageUpload } from '@/components/shared/AssetImageUpload';
import { AddressFields, AddressData } from '@/components/shared/AddressFields';
import { PropertyAmenitiesSelect } from '@/components/properties/PropertyAmenitiesSelect';
import { PropertyGalleryUpload } from '@/components/properties/PropertyGalleryUpload';
import { PropertyDocuments } from '@/components/PropertyDocuments';
import { ContactSelector } from '@/components/ContactSelector';
import { useAuth } from '@/hooks/useAuth';

export const propertySchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().trim().max(500, 'Descrição deve ter no máximo 500 caracteres').optional().nullable(),
  address: z.string().trim().max(200, 'Endereço deve ter no máximo 200 caracteres').optional().nullable(),
  city: z.string().trim().max(100, 'Cidade deve ter no máximo 100 caracteres').optional().nullable(),
  state: z.string().trim().max(2, 'Estado deve ter no máximo 2 caracteres').optional().nullable(),
  postal_code: z.string().trim().max(9, 'CEP deve ter no máximo 9 caracteres').optional().nullable(),
  commission_rate: z.number().min(0, 'Taxa deve ser maior ou igual a 0').max(100, 'Taxa deve ser menor ou igual a 100').optional().nullable(),
  image_url: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  builder_name: z.string().optional().nullable(),
  construction_stage: z.string().optional().nullable(),
  delivery_date: z.string().optional().nullable(),
  total_land_area: z.number().optional().nullable(),
  number_of_towers: z.number().optional().nullable(),
  total_units_count: z.number().optional().nullable(),
  amenities: z.array(z.string()).optional().nullable(),
  security_features: z.string().optional().nullable(),
  sustainability_features: z.string().optional().nullable(),
  technology_features: z.string().optional().nullable(),
  gallery_images: z.array(z.string()).optional().nullable(),
  // New fields for asset intelligence
  intent_type: z.enum(['sale', 'rental', 'both']).optional().nullable(),
  is_under_management: z.boolean().optional().nullable(),
  market_value: z.number().min(0).optional().nullable(),
  rental_value: z.number().min(0).optional().nullable(),
  is_occupied: z.boolean().optional().nullable(),
});

export type PropertyFormData = {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  image_url: string | null;
  commission_rate: number;
  lead_id: string | null;
  builder_name: string;
  construction_stage: string;
  delivery_date: string;
  total_land_area: string;
  number_of_towers: string;
  total_units_count: string;
  amenities: string[];
  security_features: string;
  sustainability_features: string;
  technology_features: string;
  gallery_images: string[];
  // New fields for asset intelligence
  intent_type: 'sale' | 'rental' | 'both';
  is_under_management: boolean;
  market_value: string;
  rental_value: string;
  is_occupied: boolean;
};

export interface PropertyPayload {
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  image_url: string | null;
  commission_rate: number;
  lead_id: string | null;
  builder_name: string | null;
  construction_stage: string | null;
  delivery_date: string | null;
  total_land_area: number | null;
  number_of_towers: number | null;
  total_units_count: number | null;
  amenities: string[] | null;
  security_features: string | null;
  sustainability_features: string | null;
  technology_features: string | null;
  gallery_images: string[] | null;
  // New fields for asset intelligence
  intent_type: 'sale' | 'rental' | 'both' | null;
  is_under_management: boolean | null;
  market_value: number | null;
  rental_value: number | null;
  is_occupied: boolean | null;
}

const CONSTRUCTION_STAGES = [
  { value: 'lancamento', label: 'Lançamento' },
  { value: 'em_obras', label: 'Em Obras' },
  { value: 'pronto', label: 'Pronto para Morar' },
];

const DEFAULT_FORM_DATA: PropertyFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  image_url: null,
  commission_rate: 5,
  lead_id: null,
  builder_name: '',
  construction_stage: '',
  delivery_date: '',
  total_land_area: '',
  number_of_towers: '',
  total_units_count: '',
  amenities: [],
  security_features: '',
  sustainability_features: '',
  technology_features: '',
  gallery_images: [],
  // New fields
  intent_type: 'sale',
  is_under_management: false,
  market_value: '',
  rental_value: '',
  is_occupied: false,
};

interface PropertyFormProps {
  /** Initial data for editing, omit for creation */
  initialData?: Partial<PropertyFormData> & { id?: string };
  /** Whether this is an edit form */
  isEditing?: boolean;
  /** Submit handler that receives validated payload */
  onSubmit: (payload: PropertyPayload) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Delete handler (only for edit mode) */
  onDelete?: () => void;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Property ID for document uploads (only in edit mode) */
  propertyId?: string;
  /** Callback to refresh property data after gallery changes */
  onRefreshProperty?: () => Promise<void>;
  /** Callback when form data changes (for draft persistence) */
  onFormChange?: (data: PropertyFormData) => void;
  /** When true, all inputs are disabled and submit is hidden (read-only mode) */
  disabled?: boolean;
}

export function PropertyForm({
  initialData,
  isEditing = false,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false,
  propertyId,
  onRefreshProperty,
  onFormChange,
  disabled = false,
}: PropertyFormProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  
  // Internal state for when not managed externally - must be declared FIRST
  const [internalFormData, setInternalFormData] = useState<PropertyFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initialData,
    description: initialData?.description || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postal_code: initialData?.postal_code || '',
    builder_name: initialData?.builder_name || '',
    construction_stage: initialData?.construction_stage || '',
    delivery_date: initialData?.delivery_date || '',
    total_land_area: initialData?.total_land_area || '',
    number_of_towers: initialData?.number_of_towers || '',
    total_units_count: initialData?.total_units_count || '',
    security_features: initialData?.security_features || '',
    sustainability_features: initialData?.sustainability_features || '',
    technology_features: initialData?.technology_features || '',
    amenities: initialData?.amenities || [],
    gallery_images: initialData?.gallery_images || [],
    image_url: initialData?.image_url || null,
    lead_id: initialData?.lead_id || null,
    commission_rate: initialData?.commission_rate ?? 5,
  }));
  
  // Use initialData directly if onFormChange is provided (managed externally)
  const formData: PropertyFormData = onFormChange && initialData ? {
    ...DEFAULT_FORM_DATA,
    ...initialData,
    description: initialData?.description || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postal_code: initialData?.postal_code || '',
    builder_name: initialData?.builder_name || '',
    construction_stage: initialData?.construction_stage || '',
    delivery_date: initialData?.delivery_date || '',
    total_land_area: initialData?.total_land_area || '',
    number_of_towers: initialData?.number_of_towers || '',
    total_units_count: initialData?.total_units_count || '',
    security_features: initialData?.security_features || '',
    sustainability_features: initialData?.sustainability_features || '',
    technology_features: initialData?.technology_features || '',
    amenities: initialData?.amenities || [],
    gallery_images: initialData?.gallery_images || [],
    image_url: initialData?.image_url || null,
    lead_id: initialData?.lead_id || null,
    commission_rate: initialData?.commission_rate ?? 5,
  } : internalFormData;

  // Unified setFormData that handles both internal and external state
  const setFormData = (updater: PropertyFormData | ((prev: PropertyFormData) => PropertyFormData)) => {
    if (onFormChange) {
      const newData = typeof updater === 'function' ? updater(formData) : updater;
      onFormChange(newData);
    } else {
      setInternalFormData(updater);
    }
  };

  // Update form when initialData changes (for edit mode) - only for internal state
  useEffect(() => {
    if (initialData && !onFormChange) {
      setInternalFormData({
        ...DEFAULT_FORM_DATA,
        ...initialData,
        description: initialData?.description || '',
        address: initialData?.address || '',
        city: initialData?.city || '',
        state: initialData?.state || '',
        postal_code: initialData?.postal_code || '',
        builder_name: initialData?.builder_name || '',
        construction_stage: initialData?.construction_stage || '',
        delivery_date: initialData?.delivery_date || '',
        total_land_area: initialData?.total_land_area || '',
        number_of_towers: initialData?.number_of_towers || '',
        total_units_count: initialData?.total_units_count || '',
        security_features: initialData?.security_features || '',
        sustainability_features: initialData?.sustainability_features || '',
        technology_features: initialData?.technology_features || '',
        amenities: initialData?.amenities || [],
        gallery_images: initialData?.gallery_images || [],
        image_url: initialData?.image_url || null,
        lead_id: initialData?.lead_id || null,
        commission_rate: initialData?.commission_rate ?? 5,
      });
      setActiveTab('info');
    }
  }, [initialData, onFormChange]);

  const buildPayload = (): PropertyPayload => ({
    name: formData.name.trim(),
    description: formData.description.trim() || null,
    address: formData.address.trim() || null,
    city: formData.city.trim() || null,
    state: formData.state.trim().toUpperCase() || null,
    postal_code: formData.postal_code.trim() || null,
    image_url: formData.image_url,
    commission_rate: formData.commission_rate,
    lead_id: formData.lead_id || null,
    builder_name: formData.builder_name.trim() || null,
    construction_stage: formData.construction_stage || null,
    delivery_date: formData.delivery_date || null,
    total_land_area: formData.total_land_area ? parseFloat(formData.total_land_area) : null,
    number_of_towers: formData.number_of_towers ? parseInt(formData.number_of_towers) : null,
    total_units_count: formData.total_units_count ? parseInt(formData.total_units_count) : null,
    amenities: formData.amenities.length > 0 ? formData.amenities : null,
    security_features: formData.security_features.trim() || null,
    sustainability_features: formData.sustainability_features.trim() || null,
    technology_features: formData.technology_features.trim() || null,
    gallery_images: formData.gallery_images.length > 0 ? formData.gallery_images : null,
    // New fields
    intent_type: formData.intent_type || null,
    is_under_management: formData.is_under_management ?? null,
    market_value: formData.market_value ? parseFloat(formData.market_value) : null,
    rental_value: formData.rental_value ? parseFloat(formData.rental_value) : null,
    is_occupied: formData.is_occupied ?? null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate financial fields based on intent_type
    if (formData.intent_type === 'sale' || formData.intent_type === 'both') {
      if (!formData.market_value) {
        showError('Campo obrigatório', 'Informe o Valor de Venda para imóveis com objetivo de venda.');
        return;
      }
    }

    if (formData.intent_type === 'rental' || formData.intent_type === 'both') {
      if (!formData.rental_value) {
        showError('Campo obrigatório', 'Informe o Preço de Locação para imóveis com objetivo de locação.');
        return;
      }
    }

    // For rental-only, market_value is needed for Yield calculation
    if (formData.intent_type === 'rental' && !formData.market_value) {
      showError('Campo obrigatório', 'Informe o Valor Estimado do Patrimônio para calcular a rentabilidade.');
      return;
    }

    try {
      const payload = buildPayload();
      propertySchema.parse(payload);
      await onSubmit(payload);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        showError('Erro de validação', error.errors[0].message);
      } else {
        throw error;
      }
    }
  };

  // Show documents tab only in edit mode
  const showDocumentsTab = isEditing && propertyId;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${showDocumentsTab ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <TabsTrigger value="info" className="text-xs sm:text-sm">
          <Info className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Informações</span>
          <span className="sm:hidden">Info</span>
        </TabsTrigger>
        <TabsTrigger value="amenities" className="text-xs sm:text-sm">
          <Sparkles className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Infraestrutura</span>
          <span className="sm:hidden">Lazer</span>
        </TabsTrigger>
        <TabsTrigger value="gallery" className="text-xs sm:text-sm">
          <Image className="h-4 w-4 mr-1 sm:mr-2" />
          Galeria
        </TabsTrigger>
        {showDocumentsTab && (
          <TabsTrigger value="documents" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
        )}
      </TabsList>

      <form onSubmit={handleSubmit}>
        {/* Info Tab */}
        <TabsContent value="info" className="mt-4 space-y-6">
          {/* ===== SECTION 1: OBJECTIVE & MANAGEMENT ===== */}
          <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              Objetivo e Gestão
            </div>

            {/* Intent Type Selection */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Qual o objetivo deste empreendimento? *</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={formData.intent_type === 'sale' ? 'default' : 'outline'}
                  className="w-full text-sm px-2"
                  onClick={() => setFormData({ ...formData, intent_type: 'sale' })}
                >
                  Venda
                </Button>
                <Button
                  type="button"
                  variant={formData.intent_type === 'rental' ? 'default' : 'outline'}
                  className="w-full text-sm px-2"
                  onClick={() => setFormData({ ...formData, intent_type: 'rental' })}
                >
                  Locação
                </Button>
                <Button
                  type="button"
                  variant={formData.intent_type === 'both' ? 'default' : 'outline'}
                  className="w-full text-sm px-2"
                  onClick={() => setFormData({ ...formData, intent_type: 'both' })}
                >
                  Ambos
                </Button>
              </div>
            </div>

            {/* Management Toggle */}
            <div className="flex items-start sm:items-center justify-between gap-3 p-3 rounded-lg border bg-background">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <Label htmlFor="is_under_management" className="font-medium cursor-pointer">
                    Habilitar Gestão de Ativo
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ative para monitorar a rentabilidade (Yield) e a vacância deste empreendimento no seu painel de controle, além de acompanhar as obrigações mensais na página de Gestão.
                </p>
              </div>
              <Switch
                id="is_under_management"
                checked={formData.is_under_management}
                onCheckedChange={(checked) => setFormData({ ...formData, is_under_management: checked })}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {/* ===== SECTION 2: FINANCIAL INFO (Conditional) ===== */}
          {(formData.intent_type === 'sale' || formData.intent_type === 'rental' || formData.intent_type === 'both') && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="text-lg">💰</span>
                Informações Financeiras
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {/* Sale Value - show when intent includes sale */}
                {(formData.intent_type === 'sale' || formData.intent_type === 'both') && (
                  <div className="space-y-2">
                    <Label htmlFor="market_value">Valor de Venda (R$) *</Label>
                    <CurrencyInput
                      id="market_value"
                      value={formData.market_value}
                      onChange={(value) => setFormData({ ...formData, market_value: value })}
                      placeholder="0,00"
                    />
                  </div>
                )}

                {/* Rental Value - show when intent includes rental */}
                {(formData.intent_type === 'rental' || formData.intent_type === 'both') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="rental_value">Preço de Locação (R$/mês) *</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Este valor é a base para o cálculo da sua Rentabilidade. O sistema considera este valor multiplicado por 12 meses sobre o valor de mercado do imóvel.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <CurrencyInput
                      id="rental_value"
                      value={formData.rental_value}
                      onChange={(value) => setFormData({ ...formData, rental_value: value })}
                      placeholder="0,00"
                    />
                  </div>
                )}

                {/* Market Value for rental-only (needed for Yield calculation) */}
                {formData.intent_type === 'rental' && (
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="market_value_rental">Valor Estimado do Patrimônio (R$)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Necessário para calcular a rentabilidade real do ativo (Yield = Aluguel Anual / Valor do Patrimônio).</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <CurrencyInput
                      id="market_value_rental"
                      value={formData.market_value}
                      onChange={(value) => setFormData({ ...formData, market_value: value })}
                      placeholder="0,00"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* ===== SECTION 3: PROPERTY DATA ===== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4" />
              Dados do Empreendimento
            </div>

            <AssetImageUpload
              assetType="property"
              assetId={propertyId}
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
              onImageRemoved={() => setFormData({ ...formData, image_url: null })}
              autoSave={isEditing && !!propertyId}
              onRefresh={onRefreshProperty}
              label="Imagem do Empreendimento"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome do Empreendimento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Residencial Vista Mar"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="builder_name">Construtora</Label>
              <Input
                id="builder_name"
                value={formData.builder_name}
                onChange={(e) => setFormData({ ...formData, builder_name: e.target.value })}
                placeholder="Ex: Construtora ABC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="construction_stage">Estágio da Obra</Label>
              <Select
                value={formData.construction_stage}
                onValueChange={(v) => setFormData({ ...formData, construction_stage: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CONSTRUCTION_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_date">Data de Entrega</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_land_area">Área do Terreno (m²)</Label>
              <Input
                id="total_land_area"
                type="number"
                step="0.01"
                value={formData.total_land_area}
                onChange={(e) => setFormData({ ...formData, total_land_area: e.target.value })}
                placeholder="Ex: 5000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number_of_towers">Nº de Torres</Label>
              <Input
                id="number_of_towers"
                type="number"
                value={formData.number_of_towers}
                onChange={(e) => setFormData({ ...formData, number_of_towers: e.target.value })}
                placeholder="Ex: 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_units_count">Total de Unidades</Label>
              <Input
                id="total_units_count"
                type="number"
                value={formData.total_units_count}
                onChange={(e) => setFormData({ ...formData, total_units_count: e.target.value })}
                placeholder="Ex: 120"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do empreendimento..."
              rows={3}
              maxLength={500}
            />
          </div>

          <AddressFields
            data={{
              postal_code: formData.postal_code,
              address: formData.address,
              neighborhood: '', // PropertyForm doesn't use neighborhood separately
              city: formData.city,
              state: formData.state,
            }}
            onChange={(addressData: AddressData) => setFormData({
              ...formData,
              postal_code: addressData.postal_code,
              address: addressData.address,
              city: addressData.city,
              state: addressData.state,
            })}
            layout="compact"
            showNeighborhood={false}
            includeNeighborhoodInAddress={true}
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="commission_rate" className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Taxa de Comissão (%)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Percentual de comissão usado para calcular o valor estimado de comissão no Kanban.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-3">
              <Input
                id="commission_rate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                placeholder="5.0"
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">
                Ex: R$ 500.000 → <span className="font-medium text-foreground">R$ {((500000 * formData.commission_rate) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contato Vinculado</Label>
            <ContactSelector 
              value={formData.lead_id} 
              onChange={(v) => setFormData({ ...formData, lead_id: v })} 
              placeholder="Buscar contato..."
            />
          </div>
          </div>
        </TabsContent>

        {/* Amenities & Differentials Tab */}
        <TabsContent value="amenities" className="mt-4 space-y-6">
          <PropertyAmenitiesSelect
            value={formData.amenities}
            onChange={(v) => setFormData({ ...formData, amenities: v })}
          />

          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Diferenciais do Empreendimento</h4>
            
            <div className="space-y-2">
              <Label htmlFor="security_features">Segurança</Label>
              <Textarea
                id="security_features"
                value={formData.security_features}
                onChange={(e) => setFormData({ ...formData, security_features: e.target.value })}
                placeholder="Ex: Portaria blindada, CFTV com reconhecimento facial, controle de acesso biométrico..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sustainability_features">Sustentabilidade</Label>
              <Textarea
                id="sustainability_features"
                value={formData.sustainability_features}
                onChange={(e) => setFormData({ ...formData, sustainability_features: e.target.value })}
                placeholder="Ex: Painéis solares, reuso de água, coleta seletiva, certificação LEED..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="technology_features">Tecnologia</Label>
              <Textarea
                id="technology_features"
                value={formData.technology_features}
                onChange={(e) => setFormData({ ...formData, technology_features: e.target.value })}
                placeholder="Ex: Automação residencial, fibra óptica, tomadas USB, infraestrutura para carros elétricos..."
                rows={2}
              />
            </div>
          </div>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="mt-4">
          {user && (
            <PropertyGalleryUpload
              propertyId={propertyId}
              userId={user.id}
              images={formData.gallery_images}
              onImagesChange={(images) => setFormData({ ...formData, gallery_images: images })}
              maxImages={10}
              autoSave={isEditing && !!propertyId}
              onRefresh={onRefreshProperty}
            />
          )}
          {isEditing && (
            <p className="text-xs text-muted-foreground mt-4">
              As imagens são salvas automaticamente ao serem enviadas.
            </p>
          )}
        </TabsContent>

        {/* Documents Tab (edit mode only) */}
        {showDocumentsTab && (
          <TabsContent value="documents" className="mt-4">
            {user && propertyId && (
              <PropertyDocuments propertyId={propertyId} userId={user.id} />
            )}
          </TabsContent>
        )}

        {/* Footer - visible in all tabs except documents */}
        {activeTab !== 'documents' && (
          <div className={`flex flex-col-reverse sm:flex-row ${isEditing && onDelete ? 'sm:justify-between' : 'sm:justify-end'} gap-3 pt-4 mt-4 border-t`}>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? (isEditing ? 'Salvando...' : 'Criando...') : (isEditing ? 'Salvar' : 'Criar Empreendimento')}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Tabs>
  );
}
