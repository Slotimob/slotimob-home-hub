import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar, Trash2, Building2, ExternalLink, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import type { Unit } from '@/pages/Units';
import type { Database } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { PropertyInfoCard } from '@/components/properties/PropertyInfoCard';
import { EditUnitDialog } from '@/components/units/EditUnitDialog';

import { UNIT_STATUS_STYLES } from '@/utils/uiConstants';

type UnitStatus = Database['public']['Enums']['unit_status'];

interface UnitDetailsDialogProps {
  unit: Unit;
  propertyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PropertyDetails {
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

export const UnitDetailsDialog = ({ unit, propertyName, open, onOpenChange, onSuccess }: UnitDetailsDialogProps) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [showPropertyInfo, setShowPropertyInfo] = useState(false);

  // Load property details for the condominium info card
  useEffect(() => {
    const loadPropertyDetails = async () => {
      if (!unit.property_id) return;
      
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', unit.property_id)
        .single();
      
      if (data) {
        setPropertyDetails(data as PropertyDetails);
      }
    };
    
    if (open && unit.property_id) {
      loadPropertyDetails();
    }
  }, [open, unit.property_id]);

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('units').delete().eq('id', unit.id);

      if (error) throw error;

      toast({
        title: 'Unidade excluída!',
        description: 'A unidade foi removida com sucesso.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir unidade',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    onSuccess();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Unidade</DialogTitle>
            <DialogDescription>
              {propertyName} - Unidade {unit.unit_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">Unidade {unit.unit_number}</CardTitle>
                  <Badge 
                    variant="outline"
                    className={cn(UNIT_STATUS_STYLES[unit.status].badgeClasses)}
                  >
                    {UNIT_STATUS_STYLES[unit.status].label}
                  </Badge>
                </div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Cadastrada em {new Date(unit.created_at).toLocaleDateString('pt-BR')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Preço Venda</Label>
                    <p className="text-lg font-bold text-primary">
                      {unit.price
                        ? `R$ ${unit.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Área</Label>
                    <p className="text-sm font-medium">{unit.area ? `${unit.area}m²` : 'Não informado'}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Quartos</Label>
                    <p className="text-sm">{unit.bedrooms ?? '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Banheiros</Label>
                    <p className="text-sm">{unit.bathrooms ?? '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Área</Label>
                    <p className="text-sm">{unit.area ? `${unit.area}m²` : '-'}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Condomínio</Label>
                    <p className="text-sm">
                      {unit.condo_fee
                        ? `R$ ${unit.condo_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
                        : 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IPTU</Label>
                    <p className="text-sm">
                      {unit.iptu
                        ? `R$ ${unit.iptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano`
                        : 'Não informado'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Empreendimento</Label>
                  <a
                    href={`/empreendimentos?property=${unit.property_id}`}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mt-1"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenChange(false);
                      window.location.href = `/empreendimentos?property=${unit.property_id}`;
                    }}
                  >
                    <Building2 className="h-4 w-4" />
                    {propertyName}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Property Info Collapsible Card */}
            {propertyDetails && (propertyDetails.amenities?.length || propertyDetails.gallery_images?.length || propertyDetails.builder_name) && (
              <Collapsible open={showPropertyInfo} onOpenChange={setShowPropertyInfo}>
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          Conheça o Condomínio
                        </CardTitle>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          showPropertyInfo && "rotate-180"
                        )} />
                      </div>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <PropertyInfoCard property={propertyDetails} />
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex justify-between">
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Unidade
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button onClick={() => setShowEditDialog(true)}>Editar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog - Uses full form with all fields */}
      <EditUnitDialog
        unit={unit as any}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
