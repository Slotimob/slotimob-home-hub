import { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Bed,
  Bath,
  Car,
  Square,
  MapPin,
  Home,
  Sun,
  Sofa,
  Wallet,
  Calculator,
  Share2,
  FileText,
  Copy,
  Download,
  Building2,
  User,
  Check,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePropertyPDF, PDFAssetData } from '@/utils/propertyPdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { EditUnitDialog } from '@/components/units/EditUnitDialog';

export interface PropertyUnit {
  id: string;
  unit_number: string;
  property_type: string | null;
  condition: string | null;
  price: number | null;
  rent_price: number | null;
  area: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  condo_fee: number | null;
  iptu: number | null;
  furnished: string | null;
  solar_orientation: string | null;
  is_financeable: boolean | null;
  description: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  cover_image_url: string | null;
  status: 'available' | 'reserved' | 'rented' | 'sold';
  is_standalone: boolean | null;
  property_id: string | null;
  owner?: { name: string } | null;
  property?: { name: string } | null;
}

interface PropertyDetailsSheetProps {
  property: PropertyUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditSuccess?: () => void;
}

import { UNIT_STATUS_STYLES } from '@/utils/uiConstants';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  sala_comercial: 'Sala Comercial',
  loja: 'Loja',
  galpao: 'Galpão',
  rural: 'Rural',
  outros: 'Outros',
};

const FURNISHED_LABELS: Record<string, string> = {
  sim: 'Mobiliado',
  semimobiliado: 'Semimobiliado',
  nao: 'Sem mobília',
};

const SOLAR_LABELS: Record<string, string> = {
  norte: 'Norte',
  sul: 'Sul',
  leste: 'Leste',
  oeste: 'Oeste',
};

export function PropertyDetailsSheet({
  property,
  open,
  onOpenChange,
  onEditSuccess,
}: PropertyDetailsSheetProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    onEditSuccess?.();
  };

  // Financing simulation
  const financingSimulation = useMemo(() => {
    if (!property?.price || !property.is_financeable) return null;

    const price = property.price;
    const downPaymentPercent = 20;
    const downPayment = price * (downPaymentPercent / 100);
    const financedAmount = price - downPayment;
    const annualRate = 0.095; // 9.5% annual
    const monthlyRate = annualRate / 12;
    const months = 360; // 30 years

    // PRICE table calculation
    const monthlyPayment =
      financedAmount *
      ((monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1));

    return {
      downPaymentPercent,
      downPayment,
      financedAmount,
      monthlyPayment,
      months,
      annualRate: annualRate * 100,
    };
  }, [property?.price, property?.is_financeable]);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleCopyLink = async () => {
    if (!property) return;
    const url = `${window.location.origin}/imovel/${property.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copiado!', description: 'Link do imóvel copiado para a área de transferência.' });
  };

  const handleGeneratePDF = async () => {
    if (!property) return;
    
    const pdfData: PDFAssetData = {
      mode: property.is_standalone ? 'standalone' : 'property_unit',
      unit: {
        id: property.id,
        unit_number: property.unit_number,
        property_type: property.property_type,
        condition: property.condition,
        price: property.price,
        rent_price: property.rent_price,
        area: property.area,
        bedrooms: property.bedrooms,
        suites: property.suites,
        bathrooms: property.bathrooms,
        parking_spots: property.parking_spots,
        condo_fee: property.condo_fee,
        iptu: property.iptu,
        furnished: property.furnished,
        solar_orientation: property.solar_orientation,
        is_financeable: property.is_financeable,
        description: property.description,
        address: property.address,
        neighborhood: property.neighborhood,
        city: property.city,
        state: property.state,
        postal_code: property.postal_code,
        cover_image_url: property.cover_image_url,
      },
      title: property.unit_number,
      subtitle: property.property?.name || undefined,
      financingSimulation: financingSimulation,
    };
    
    await generatePropertyPDF(pdfData);
    toast({ title: 'PDF gerado!', description: 'A apresentação do imóvel foi baixada.' });
  };

  const fullAddress = [
    property?.address,
    property?.neighborhood,
    property?.city && property?.state ? `${property.city}/${property.state}` : property?.city || property?.state,
    property?.postal_code,
  ]
    .filter(Boolean)
    .join(', ');

  const content = property ? (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4 sm:p-6">
          {/* Hero Image */}
          <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg bg-muted">
            {property.cover_image_url ? (
              <img
                src={property.cover_image_url}
                alt={property.unit_number}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Home className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </AspectRatio>

          {/* Header Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{property.unit_number}</h2>
                {property.property_type && (
                  <p className="text-muted-foreground">
                    {PROPERTY_TYPE_LABELS[property.property_type] || property.property_type}
                  </p>
                )}
              </div>
              <Badge className={cn('shrink-0', UNIT_STATUS_STYLES[property.status].badgeClasses)}>
                {UNIT_STATUS_STYLES[property.status].label}
              </Badge>
            </div>

            {fullAddress && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{fullAddress}</span>
              </div>
            )}

            {/* Price Display */}
            <div className="flex flex-wrap gap-4">
              {property.price && (
                <div>
                  <p className="text-xs text-muted-foreground">Venda</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(property.price)}</p>
                </div>
              )}
              {property.rent_price && (
                <div>
                  <p className="text-xs text-muted-foreground">Locação/mês</p>
                  <p className="text-xl font-semibold text-primary">{formatCurrency(property.rent_price)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {property.area && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Square className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Área</p>
                  <p className="font-medium">{property.area}m²</p>
                </div>
              </div>
            )}
            {property.bedrooms !== null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Bed className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Quartos</p>
                  <p className="font-medium">
                    {property.bedrooms}
                    {property.suites ? ` (${property.suites} suíte${property.suites > 1 ? 's' : ''})` : ''}
                  </p>
                </div>
              </div>
            )}
            {property.bathrooms !== null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Bath className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Banheiros</p>
                  <p className="font-medium">{property.bathrooms}</p>
                </div>
              </div>
            )}
            {property.parking_spots !== null && property.parking_spots > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Vagas</p>
                  <p className="font-medium">{property.parking_spots}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs for Details */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="costs">Custos</TabsTrigger>
              <TabsTrigger value="financing">Simulação</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              {/* Description */}
              {property.description && (
                <div>
                  <h4 className="font-medium mb-2">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Features */}
              <div className="grid gap-3 sm:grid-cols-2">
                {property.furnished && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sofa className="h-4 w-4 text-muted-foreground" />
                    <span>{FURNISHED_LABELS[property.furnished] || property.furnished}</span>
                  </div>
                )}
                {property.solar_orientation && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <span>Face {SOLAR_LABELS[property.solar_orientation]}</span>
                  </div>
                )}
                {property.is_financeable && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Aceita financiamento</span>
                  </div>
                )}
              </div>

              {/* Owner/Property Info */}
              {(property.owner?.name || property.property?.name) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {property.property?.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Empreendimento: <strong>{property.property.name}</strong></span>
                      </div>
                    )}
                    {property.owner?.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Proprietário: <strong>{property.owner.name}</strong></span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="costs" className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Condomínio</span>
                    <span className="font-medium">{formatCurrency(property.condo_fee)}/mês</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">IPTU</span>
                    <span className="font-medium">{formatCurrency(property.iptu)}/ano</span>
                  </div>
                  {property.iptu && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>IPTU mensal</span>
                        <span>{formatCurrency(property.iptu / 12)}/mês</span>
                      </div>
                    </>
                  )}
                  {(property.condo_fee || property.iptu) && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span>Custo mensal total</span>
                        <span className="text-primary">
                          {formatCurrency((property.condo_fee || 0) + (property.iptu || 0) / 12)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financing" className="mt-4 space-y-4">
              {financingSimulation ? (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Calculator className="h-5 w-5" />
                      <h4 className="font-semibold">Simulação de Financiamento</h4>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Entrada sugerida ({financingSimulation.downPaymentPercent}%)</p>
                        <p className="text-lg font-bold">{formatCurrency(financingSimulation.downPayment)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor financiado</p>
                        <p className="text-lg font-bold">{formatCurrency(financingSimulation.financedAmount)}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="text-center p-4 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Parcela estimada</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(financingSimulation.monthlyPayment)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        em {financingSimulation.months / 12} anos • {financingSimulation.annualRate}% a.a.
                      </p>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      * Simulação ilustrativa com base na tabela PRICE. Condições sujeitas à aprovação de crédito.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Simulação não disponível</p>
                  <p className="text-sm">
                    {!property.price
                      ? 'Informe o preço do imóvel para simular.'
                      : 'Este imóvel não aceita financiamento.'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="border-t p-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Copiado!' : 'Link'}
        </Button>
        <Button size="sm" className="flex-1" onClick={handleGeneratePDF}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>

      {/* Edit Dialog */}
      {property && (
        <EditUnitDialog
          unit={property as any}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Detalhes do Imóvel</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do Imóvel</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
