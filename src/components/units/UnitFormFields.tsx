import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactSelector } from '@/components/ContactSelector';
import { AssetImageUpload } from '@/components/shared/AssetImageUpload';
import { AddressFields, AddressData } from '@/components/shared/AddressFields';
import { CreatePropertyQuickDialog } from '@/components/units/CreatePropertyQuickDialog';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { ContactCategory } from '@/components/contacts/ContactCategoryFilter';
import { TagsInput } from '@/components/units/TagsInput';
import { Plus, Search, Building2, HelpCircle, Target, Settings2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Database } from '@/integrations/supabase/types';
import { ALL_UNIT_STATUSES, getStatusLabel } from '@/utils/uiConstants';

type UnitStatus = Database['public']['Enums']['unit_status'];
type IntentType = 'sale' | 'rental' | 'both';

interface Property {
  id: string;
  name: string;
}

export interface UnitFormData {
  unit_number: string;
  status: UnitStatus;
  property_type: string;
  condition: string;
  price: string;
  rent_price: string;
  area: string;
  bedrooms: string;
  suites: string;
  bathrooms: string;
  parking_spots: string;
  condo_fee: string;
  iptu: string;
  furnished: string;
  solar_orientation: string;
  is_financeable: boolean;
  registration_number: string;
  has_no_registration: boolean;
  iptu_number: string;
  cib: string;
  // Use contact IDs for unified contacts table (NOT legacy owner_id/lead_id)
  owner_contact_id: string;
  tenant_contact_id: string | null;
  cover_image_url: string | null;
  property_id?: string;
  is_managed: boolean;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  tags: string[];
  // New fields for asset intelligence
  intent_type: IntentType;
  market_value: string;
  is_occupied: boolean;
}

export const getInitialFormData = (): UnitFormData => ({
  unit_number: '',
  status: 'available',
  property_type: '',
  condition: '',
  price: '',
  rent_price: '',
  area: '',
  bedrooms: '',
  suites: '',
  bathrooms: '',
  parking_spots: '',
  condo_fee: '',
  iptu: '',
  furnished: '',
  solar_orientation: '',
  is_financeable: true,
  registration_number: '',
  has_no_registration: false,
  iptu_number: '',
  cib: '',
  owner_contact_id: '',
  tenant_contact_id: null,
  cover_image_url: null,
  property_id: '',
  is_managed: false,
  description: '',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  postal_code: '',
  tags: [],
  // New fields
  intent_type: 'sale',
  market_value: '',
  is_occupied: false,
});

interface UnitFormFieldsProps {
  formData: UnitFormData;
  setFormData: (data: UnitFormData) => void;
  properties?: Property[];
  showImageUpload?: boolean;
  showPropertySelector?: boolean;
  propertyRequired?: boolean;
  /** When true, shows address fields; when false (unit mode), hides them */
  isStandalone?: boolean;
  onPropertiesChange?: (properties: Property[]) => void;
  /** When true, all inputs are disabled (read-only mode) */
  disabled?: boolean;
}

export const UnitFormFields = ({
  formData,
  setFormData,
  properties = [],
  showImageUpload = true,
  showPropertySelector = false,
  propertyRequired = false,
  isStandalone = false,
  onPropertiesChange,
}: UnitFormFieldsProps) => {
  const [isCreatePropertyDialogOpen, setIsCreatePropertyDialogOpen] = useState(false);
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  
  // Contact creation dialog state
  const [isCreateContactDialogOpen, setIsCreateContactDialogOpen] = useState(false);
  const [createContactCategory, setCreateContactCategory] = useState<ContactCategory>('Proprietário');
  const [contactSelectorKey, setContactSelectorKey] = useState(0);

  const handlePropertyCreated = (newProperty: { id: string; name: string }) => {
    const updatedProperties = [...properties, newProperty];
    if (onPropertiesChange) {
      onPropertiesChange(updatedProperties);
    }
    setFormData({ ...formData, property_id: newProperty.id });
  };

  const handleCreateContactClick = (category: ContactCategory) => {
    setCreateContactCategory(category);
    setIsCreateContactDialogOpen(true);
  };

  const handleContactCreated = () => {
    // Force ContactSelector to reload contacts
    setContactSelectorKey(prev => prev + 1);
  };

  // Determine which financial fields to show based on intent
  const showSaleFields = formData.intent_type === 'sale' || formData.intent_type === 'both';
  const showRentalFields = formData.intent_type === 'rental' || formData.intent_type === 'both';
  const showMarketValueForRentalOnly = formData.intent_type === 'rental';

  return (
    <div className="space-y-6">
      {/* ===== SECTION 1: OBJECTIVE & MANAGEMENT ===== */}
      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="h-4 w-4" />
          Objetivo e Gestão
        </div>

        {/* Intent Type Selection */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Qual o objetivo deste imóvel? *</Label>
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
              <Label htmlFor="is_managed" className="font-medium cursor-pointer">
                Habilitar Gestão de Ativo
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Ative para monitorar a rentabilidade (Yield) e a vacância deste imóvel no seu painel de controle, além de acompanhar as obrigações mensais na página de Gestão.
            </p>
          </div>
          <Switch
            id="is_managed"
            checked={formData.is_managed}
            onCheckedChange={(checked) => setFormData({ ...formData, is_managed: checked })}
            className="flex-shrink-0"
          />
        </div>
      </div>

      <Separator />

      {/* ===== SECTION 2: PROPERTY DATA ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building2 className="h-4 w-4" />
          Dados do Imóvel
        </div>

        {showImageUpload && (
          <AssetImageUpload
            assetType="unit"
            currentImageUrl={formData.cover_image_url}
            onImageUploaded={(url) => setFormData({ ...formData, cover_image_url: url })}
            onImageRemoved={() => setFormData({ ...formData, cover_image_url: null })}
          />
        )}

        {/* Property Selector (for Units page) */}
        {showPropertySelector && (
          <div className="space-y-2">
            <Label>Empreendimento {propertyRequired && '*'}</Label>
            <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={propertySearchOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.property_id
                    ? properties.find((p) => p.id === formData.property_id)?.name || 'Selecione um empreendimento...'
                    : 'Selecione um empreendimento...'}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                    <CommandEmpty>
                      <div className="py-4 text-center">
                        <p className="text-sm text-muted-foreground mb-3">Nenhum empreendimento encontrado.</p>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setPropertySearchOpen(false);
                            setIsCreatePropertyDialogOpen(true);
                          }}
                          className="gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Criar Novo Empreendimento
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {properties.map((prop) => (
                        <CommandItem
                          key={prop.id}
                          value={prop.name}
                          onSelect={() => {
                            setFormData({ ...formData, property_id: prop.id });
                            setPropertySearchOpen(false);
                            setPropertySearch('');
                          }}
                          className="cursor-pointer"
                        >
                          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          {prop.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setPropertySearchOpen(false);
                          setIsCreatePropertyDialogOpen(true);
                        }}
                        className="cursor-pointer text-primary"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Novo Empreendimento
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <CreatePropertyQuickDialog
          open={isCreatePropertyDialogOpen}
          onOpenChange={setIsCreatePropertyDialogOpen}
          onPropertyCreated={handlePropertyCreated}
        />

        {/* Identification and Type */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unit_number">Identificação/Número *</Label>
            <Input
              id="unit_number"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              placeholder="Ex: 101, Casa 01, Lote 15"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Imóvel</Label>
            <Select
              value={formData.property_type}
              onValueChange={(v) => setFormData({ ...formData, property_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartamento">Apartamento</SelectItem>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="terreno">Terreno</SelectItem>
                <SelectItem value="sala_comercial">Sala Comercial</SelectItem>
                <SelectItem value="loja">Loja</SelectItem>
                <SelectItem value="galpao">Galpão</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status and Condition */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: UnitStatus) => {
                // Sync is_occupied with status: rented = occupied, available = not occupied
                const newIsOccupied = value === 'rented' ? true : (value === 'available' ? false : formData.is_occupied);
                setFormData({ 
                  ...formData, 
                  status: value,
                  is_occupied: newIsOccupied
                });
              }}
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
          <div className="space-y-2">
            <Label>Condição</Label>
            <Select
              value={formData.condition}
              onValueChange={(v) => setFormData({ ...formData, condition: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="construcao">Em Construção</SelectItem>
                <SelectItem value="na_planta">Na Planta</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="usado">Usado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Characteristics */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
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
            <Label htmlFor="suites">Suítes</Label>
            <Input
              id="suites"
              type="number"
              min="0"
              value={formData.suites}
              onChange={(e) => setFormData({ ...formData, suites: e.target.value })}
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

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parking_spots">Vagas de Garagem</Label>
            <Input
              id="parking_spots"
              type="number"
              min="0"
              value={formData.parking_spots}
              onChange={(e) => setFormData({ ...formData, parking_spots: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Mobiliado</Label>
            <Select
              value={formData.furnished}
              onValueChange={(v) => setFormData({ ...formData, furnished: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="semimobiliado">Semimobiliado</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Orientação Solar</Label>
          <Select
            value={formData.solar_orientation}
            onValueChange={(v) => setFormData({ ...formData, solar_orientation: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="norte">Norte</SelectItem>
              <SelectItem value="sul">Sul</SelectItem>
              <SelectItem value="leste">Leste</SelectItem>
              <SelectItem value="oeste">Oeste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição do Imóvel</Label>
          <textarea
            id="description"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descreva as características, diferenciais e pontos de destaque do imóvel..."
          />
        </div>

        {/* Address section - only show for standalone units */}
        {isStandalone && (
          <AddressFields
            data={{
              postal_code: formData.postal_code,
              address: formData.address,
              neighborhood: formData.neighborhood,
              city: formData.city,
              state: formData.state,
            }}
            onChange={(addressData: AddressData) => setFormData({
              ...formData,
              ...addressData,
            })}
            layout="full"
          />
        )}
      </div>

      <Separator />

      {/* ===== SECTION 3: FINANCIAL INFORMATION ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="text-lg">💰</span>
          Informações Financeiras
        </div>

        {/* Sale Price - show when intent includes sale */}
        {showSaleFields && (
          <div className="space-y-2">
            <Label htmlFor="price">Valor de Venda (R$) *</Label>
            <CurrencyInput
              id="price"
              value={formData.price}
              onChange={(value) => setFormData({ ...formData, price: value })}
              placeholder="0,00"
            />
          </div>
        )}

        {/* Rental Price - show when intent includes rental */}
        {showRentalFields && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="rent_price">Preço de Locação (R$/mês) *</Label>
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
              id="rent_price"
              value={formData.rent_price}
              onChange={(value) => setFormData({ ...formData, rent_price: value })}
              placeholder="0,00"
            />
          </div>
        )}

        {/* Market Value - show for rental only OR when managed */}
        {(showMarketValueForRentalOnly || formData.is_managed) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="market_value">
                {showMarketValueForRentalOnly ? 'Valor Estimado do Patrimônio (R$)' : 'Valor de Mercado (R$)'}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      {showMarketValueForRentalOnly 
                        ? 'Necessário para calcular a rentabilidade real do ativo (Yield = Aluguel Anual / Valor do Patrimônio).'
                        : 'Valor estimado de mercado para cálculos de rentabilidade e patrimônio.'
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CurrencyInput
              id="market_value"
              value={formData.market_value}
              onChange={(value) => setFormData({ ...formData, market_value: value })}
              placeholder="0,00"
            />
          </div>
        )}

        {/* IPTU and Condo Fee */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="iptu">Valor IPTU (R$/ano)</Label>
            <CurrencyInput
              id="iptu"
              value={formData.iptu}
              onChange={(value) => setFormData({ ...formData, iptu: value })}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="condo_fee">Condomínio (R$/mês)</Label>
            <CurrencyInput
              id="condo_fee"
              value={formData.condo_fee}
              onChange={(value) => setFormData({ ...formData, condo_fee: value })}
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* ===== SECTION 4: DOCUMENTATION & OWNERSHIP ===== */}
      <div className="space-y-4">
        {/* Registration, IPTU Number and CIB - Responsive grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="registration_number">Nº da Matrícula</Label>
            <Input
              id="registration_number"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              placeholder="Número do registro"
              disabled={formData.has_no_registration}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iptu_number">Nº Inscrição IPTU</Label>
            <Input
              id="iptu_number"
              value={formData.iptu_number}
              onChange={(e) => setFormData({ ...formData, iptu_number: e.target.value })}
              placeholder="Número da inscrição"
            />
          </div>
          {/* CIB - Highlighted for DIMOB importance */}
          <div className="space-y-2 p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
            <Label htmlFor="cib" className="inline-flex items-center gap-1 font-semibold text-primary">
              Nº CIB
              <span className="text-xs font-normal text-primary/80">(Obrigatório DIMOB)</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-primary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>Cadastro Imobiliário Brasileiro</strong> - Identificador único do imóvel no sistema nacional. Este é o campo mais importante para a declaração DIMOB à Receita Federal.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="cib"
              value={formData.cib}
              onChange={(e) => setFormData({ ...formData, cib: e.target.value })}
              placeholder="Ex: 0000.0000.0000.0000-00"
              className="font-mono border-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="has_no_registration"
              checked={formData.has_no_registration}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, has_no_registration: !!checked, registration_number: '' })
              }
            />
            <Label htmlFor="has_no_registration" className="cursor-pointer">
              Não possui matrícula
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_financeable"
              checked={formData.is_financeable}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_financeable: !!checked })
              }
            />
            <Label htmlFor="is_financeable" className="cursor-pointer">
              Aceita financiamento
            </Label>
          </div>
        </div>

        {/* Owner Contact */}
        <div className="space-y-2">
          <Label>Responsável pelo Ativo (Proprietário)</Label>
          <ContactSelector
            key={`owner-${contactSelectorKey}`}
            value={formData.owner_contact_id || null}
            onChange={(v) => setFormData({ ...formData, owner_contact_id: v || '' })}
            placeholder="Buscar proprietário..."
            filterCategories={['Proprietário']}
            autoAddCategory="Proprietário"
            showCreateButton
            onCreateClick={() => handleCreateContactClick('Proprietário')}
          />
        </div>

        {/* Tenant Contact - only show when status is rented or occupied */}
        {(formData.status === 'rented' || formData.is_occupied) && (
          <div className="space-y-2">
            <Label>Ocupante (Inquilino)</Label>
            <ContactSelector
              key={`tenant-${contactSelectorKey}`}
              value={formData.tenant_contact_id}
              onChange={(v) => setFormData({ ...formData, tenant_contact_id: v })}
              placeholder="Buscar inquilino..."
              filterCategories={['Inquilino']}
              autoAddCategory="Inquilino"
              showCreateButton
              onCreateClick={() => handleCreateContactClick('Inquilino')}
            />
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagsInput
            value={formData.tags}
            onChange={(tags) => setFormData({ ...formData, tags })}
            placeholder="Adicionar tags personalizadas..."
          />
        </div>
      </div>

      {/* Create Contact Dialog */}
      <CreateContactDialog
        open={isCreateContactDialogOpen}
        onOpenChange={setIsCreateContactDialogOpen}
        onSuccess={handleContactCreated}
        defaultCategory={createContactCategory}
      />
    </div>
  );
};
