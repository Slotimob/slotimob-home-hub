/**
 * Campos de formulário do Empreendimento, extraídos de `PropertyForm.tsx`.
 *
 * Segue o mesmo padrão de `UnitFormFields.tsx`: componentes "burros" que recebem
 * `formData` + `setFormData` e podem ser montados tanto por um wrapper com abas
 * internas (criação — `PropertyForm`) quanto diretamente como abas de nível único
 * (edição — `PropertyDetalhe`).
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { z } from 'zod';
import { HelpCircle, Percent, Info, Target, Settings2 } from 'lucide-react';
import { AssetImageUpload } from '@/components/shared/AssetImageUpload';
import { AddressFields, AddressData } from '@/components/shared/AddressFields';
import { PropertyAmenitiesSelect } from '@/components/properties/PropertyAmenitiesSelect';
import { PropertyGalleryUpload } from '@/components/properties/PropertyGalleryUpload';
import { ContactSelector } from '@/components/ContactSelector';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { showError } from '@/utils/notifications';

export const propertySchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().trim().max(500, 'Descrição deve ter no máximo 500 caracteres').optional().nullable(),
  address: z.string().trim().max(200, 'Endereço deve ter no máximo 200 caracteres').optional().nullable(),
  neighborhood: z.string().trim().max(100, 'Bairro deve ter no máximo 100 caracteres').optional().nullable(),
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
  neighborhood: string;
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
  neighborhood: string | null;
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
  intent_type: 'sale' | 'rental' | 'both' | null;
  is_under_management: boolean | null;
  market_value: number | null;
  rental_value: number | null;
  is_occupied: boolean | null;
}

export const CONSTRUCTION_STAGES = [
  { value: 'lancamento', label: 'Lançamento' },
  { value: 'em_obras', label: 'Em Obras' },
  { value: 'pronto', label: 'Pronto para Morar' },
];

export const DEFAULT_PROPERTY_FORM_DATA: PropertyFormData = {
  name: '',
  description: '',
  address: '',
  neighborhood: '',
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
  intent_type: 'sale',
  is_under_management: false,
  market_value: '',
  rental_value: '',
  is_occupied: false,
};

/** Garante que todos os campos string/array estejam preenchidos (nunca null/undefined) */
export function normalizePropertyFormData(
  initialData?: Partial<PropertyFormData> | null
): PropertyFormData {
  return {
    ...DEFAULT_PROPERTY_FORM_DATA,
    ...(initialData || {}),
    description: initialData?.description || '',
    address: initialData?.address || '',
    neighborhood: initialData?.neighborhood || '',
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
  };
}

export function buildPropertyPayload(formData: PropertyFormData): PropertyPayload {
  return {
    name: formData.name.trim(),
    description: formData.description.trim() || null,
    address: formData.address.trim() || null,
    neighborhood: formData.neighborhood.trim() || null,
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
    intent_type: formData.intent_type || null,
    is_under_management: formData.is_under_management ?? null,
    market_value: formData.market_value ? parseFloat(formData.market_value) : null,
    rental_value: formData.rental_value ? parseFloat(formData.rental_value) : null,
    is_occupied: formData.is_occupied ?? null,
  };
}

/**
 * Valida as regras financeiras dependentes do `intent_type`.
 * Retorna `true` quando o formulário está apto a ser salvo (mostra o toast de erro caso contrário).
 */
export function validatePropertyFinancials(formData: PropertyFormData): boolean {
  if (formData.intent_type === 'sale' || formData.intent_type === 'both') {
    if (!formData.market_value) {
      showError('Campo obrigatório', 'Informe o Valor de Venda para imóveis com objetivo de venda.');
      return false;
    }
  }

  if (formData.intent_type === 'rental' || formData.intent_type === 'both') {
    if (!formData.rental_value) {
      showError('Campo obrigatório', 'Informe o Preço de Locação para imóveis com objetivo de locação.');
      return false;
    }
  }

  if (formData.intent_type === 'rental' && !formData.market_value) {
    showError('Campo obrigatório', 'Informe o Valor Estimado do Patrimônio para calcular a rentabilidade.');
    return false;
  }

  return true;
}

type SetFormData = (data: PropertyFormData) => void;

interface FieldsProps {
  formData: PropertyFormData;
  setFormData: SetFormData;
  disabled?: boolean;
}

interface InfoFieldsProps extends FieldsProps {
  isEditing?: boolean;
  propertyId?: string;
  onRefreshProperty?: () => Promise<void>;
}

/**
 * Aba "Informações": Objetivo/Gestão, Financeiro, Dados do Empreendimento,
 * Endereço, Comissão e Contato vinculado.
 */
export function PropertyInfoFields({
  formData,
  setFormData,
  disabled = false,
  isEditing = false,
  propertyId,
  onRefreshProperty,
}: InfoFieldsProps) {
  return (
    <div className="space-y-6">
      {/* ===== SECTION 1: OBJECTIVE & MANAGEMENT ===== */}
      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="h-4 w-4" />
          Objetivo e Gestão
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Qual o objetivo deste empreendimento? *</Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'sale', label: 'Venda' },
              { value: 'rental', label: 'Locação' },
              { value: 'both', label: 'Ambos' },
            ] as const).map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={formData.intent_type === opt.value ? 'default' : 'outline'}
                className="w-full text-sm px-2"
                onClick={() => setFormData({ ...formData, intent_type: opt.value })}
                disabled={disabled}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-start sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card">
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
            disabled={disabled}
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
                {CONSTRUCTION_STAGES.map((stage) => (
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
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
          }}
          onChange={(addressData: AddressData) =>
            setFormData({
              ...formData,
              postal_code: addressData.postal_code,
              address: addressData.address,
              neighborhood: addressData.neighborhood,
              city: addressData.city,
              state: addressData.state,
            })
          }
          layout="full"
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
              Ex: R$ 500.000 →{' '}
              <span className="font-medium text-foreground">
                R$ {((500000 * formData.commission_rate) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
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
    </div>
  );
}

/** Aba "Infraestrutura": lazer/amenities + diferenciais */
export function PropertyAmenitiesFields({ formData, setFormData }: FieldsProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}

interface GalleryFieldsProps extends FieldsProps {
  isEditing?: boolean;
  propertyId?: string;
  onRefreshProperty?: () => Promise<void>;
}

/** Aba "Galeria": upload múltiplo com autosave em modo edição */
export function PropertyGalleryFields({
  formData,
  setFormData,
  isEditing = false,
  propertyId,
  onRefreshProperty,
}: GalleryFieldsProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();

  return (
    <div>
      {user && (
        <PropertyGalleryUpload
          propertyId={propertyId}
          userId={effectiveBrokerId}
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
    </div>
  );
}
