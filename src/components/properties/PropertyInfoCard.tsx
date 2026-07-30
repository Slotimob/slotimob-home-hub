import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PropertyImage } from '@/components/ui/PropertyImage';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Ruler, 
  Building, 
  Home,
  Shield,
  Leaf,
  Cpu,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyAmenitiesSelect, AMENITIES_OPTIONS } from './PropertyAmenitiesSelect';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generatePropertyPDF, buildPDFDataFromStandalone, type AgentInfo } from '@/utils/propertyPdfGenerator';
import { ImageLightbox } from '@/components/shared/ImageLightbox';

interface PropertyData {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  image_url?: string | null;
  builder_name?: string | null;
  construction_stage?: string | null;
  delivery_date?: string | null;
  total_land_area?: number | null;
  number_of_towers?: number | null;
  total_units_count?: number | null;
  amenities?: string[] | null;
  security_features?: string | null;
  sustainability_features?: string | null;
  technology_features?: string | null;
  gallery_images?: string[] | null;
}

interface PropertyInfoCardProps {
  property: PropertyData;
  compact?: boolean;
}

const CONSTRUCTION_STAGE_LABELS: Record<string, string> = {
  lancamento: 'Lançamento',
  em_obras: 'Em Obras',
  pronto: 'Pronto para Morar',
};

const CONSTRUCTION_STAGE_COLORS: Record<string, string> = {
  lancamento: 'bg-blue-500',
  em_obras: 'bg-amber-500',
  pronto: 'bg-green-500',
};

export const PropertyInfoCard = ({ property, compact = false }: PropertyInfoCardProps) => {
  const [showGallery, setShowGallery] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const amenities = property.amenities || [];
  const galleryImages = property.gallery_images || [];

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfData = buildPDFDataFromStandalone({
        id: property.id,
        unit_number: property.name,
        property_type: null,
        condition: property.construction_stage,
        price: null,
        rent_price: null,
        area: property.total_land_area,
        bedrooms: null,
        suites: null,
        bathrooms: null,
        parking_spots: null,
        condo_fee: null,
        iptu: null,
        furnished: null,
        solar_orientation: null,
        is_financeable: null,
        description: property.description,
        address: property.address,
        neighborhood: null,
        city: property.city,
        state: property.state,
        postal_code: null,
        cover_image_url: property.image_url,
      });

      const agent: AgentInfo = {
        name: user?.user_metadata?.full_name || user?.email || 'Corretor',
        email: user?.email || undefined,
      };

      await generatePropertyPDF(pdfData, agent);
      toast({ title: 'PDF gerado com sucesso!', description: 'O download iniciará automaticamente.' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro ao gerar PDF', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
            <PropertyImage
              src={property.image_url}
              alt={property.name ?? 'Imóvel'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm truncate">{property.name}</h3>
              {property.construction_stage && (
                <Badge 
                  variant="secondary" 
                  className={`text-white text-[10px] shrink-0 ${CONSTRUCTION_STAGE_COLORS[property.construction_stage]}`}
                >
                  {CONSTRUCTION_STAGE_LABELS[property.construction_stage]}
                </Badge>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              {property.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.city}{property.state && `/${property.state}`}
                </span>
              )}
              {property.total_units_count && (
                <span className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  {property.total_units_count} unid.
                </span>
              )}
              {amenities.length > 0 && (
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {amenities.length} amenidades
                </span>
              )}
            </div>

            {/* Amenities Preview */}
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {amenities.slice(0, 4).map(amenityId => {
                  const amenity = AMENITIES_OPTIONS.find(a => a.id === amenityId);
                  if (!amenity) return null;
                  const Icon = amenity.icon;
                  return (
                    <Badge key={amenityId} variant="outline" className="text-[10px] py-0 px-1.5 gap-1">
                      <Icon className="h-2.5 w-2.5" />
                      {amenity.label}
                    </Badge>
                  );
                })}
                {amenities.length > 4 && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    +{amenities.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Conheça o Condomínio
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{property.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPdf}
              className="gap-1.5"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar Ficha'}
            </Button>
            {property.construction_stage && (
              <Badge 
                className={`text-white ${CONSTRUCTION_STAGE_COLORS[property.construction_stage]}`}
              >
                {CONSTRUCTION_STAGE_LABELS[property.construction_stage]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Image */}
        {(property.image_url || galleryImages.length > 0) && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <PropertyImage
              src={property.image_url || galleryImages[0]}
              alt={property.name ?? 'Imóvel'}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
            />
            {galleryImages.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 gap-1"
                onClick={() => setShowGallery(true)}
              >
                <ImageIcon className="h-4 w-4" />
                Ver {galleryImages.length} fotos
              </Button>
            )}
          </div>
        )}

        {/* Project Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {property.builder_name && (
            <div>
              <p className="text-xs text-muted-foreground">Construtora</p>
              <p className="font-medium">{property.builder_name}</p>
            </div>
          )}
          {property.delivery_date && (
            <div>
              <p className="text-xs text-muted-foreground">Entrega</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(property.delivery_date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
          {property.total_land_area && (
            <div>
              <p className="text-xs text-muted-foreground">Área do Terreno</p>
              <p className="font-medium flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {property.total_land_area.toLocaleString('pt-BR')}m²
              </p>
            </div>
          )}
          {property.number_of_towers && (
            <div>
              <p className="text-xs text-muted-foreground">Torres</p>
              <p className="font-medium">{property.number_of_towers}</p>
            </div>
          )}
          {property.total_units_count && (
            <div>
              <p className="text-xs text-muted-foreground">Total de Unidades</p>
              <p className="font-medium">{property.total_units_count}</p>
            </div>
          )}
          {property.city && (
            <div>
              <p className="text-xs text-muted-foreground">Localização</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {property.city}{property.state && ` - ${property.state}`}
              </p>
            </div>
          )}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Infraestrutura de Lazer</p>
              <PropertyAmenitiesSelect value={amenities} onChange={() => {}} readOnly />
            </div>
          </>
        )}

        {/* Differentials */}
        {(property.security_features || property.sustainability_features || property.technology_features) && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Diferenciais</p>
              {property.security_features && (
                <div className="flex gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Segurança</p>
                    <p className="text-xs text-muted-foreground">{property.security_features}</p>
                  </div>
                </div>
              )}
              {property.sustainability_features && (
                <div className="flex gap-2">
                  <Leaf className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Sustentabilidade</p>
                    <p className="text-xs text-muted-foreground">{property.sustainability_features}</p>
                  </div>
                </div>
              )}
              {property.technology_features && (
                <div className="flex gap-2">
                  <Cpu className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">Tecnologia</p>
                    <p className="text-xs text-muted-foreground">{property.technology_features}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Description */}
        {property.description && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sobre o Empreendimento</p>
              <p className="text-sm">{property.description}</p>
            </div>
          </>
        )}
      </CardContent>

      {/* Gallery Dialog */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Galeria - {property.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <PropertyImage
                src={galleryImages[selectedImageIndex]}
                alt={`Foto ${selectedImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {galleryImages.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    index === selectedImageIndex ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <PropertyImage src={url} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
