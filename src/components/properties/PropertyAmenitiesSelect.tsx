import { useState } from 'react';
import { Check, Dumbbell, Waves, Users, Dog, Baby, TrendingUp, Utensils, Building, Shield, Trees, Wifi, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const AMENITIES_OPTIONS = [
  { id: 'piscina_adulto', label: 'Piscina Adulto', icon: Waves },
  { id: 'piscina_infantil', label: 'Piscina Infantil', icon: Waves },
  { id: 'academia', label: 'Academia', icon: Dumbbell },
  { id: 'coworking', label: 'Coworking', icon: Building },
  { id: 'salao_festas', label: 'Salão de Festas', icon: Users },
  { id: 'espaco_gourmet', label: 'Espaço Gourmet', icon: Utensils },
  { id: 'pet_place', label: 'Pet Place', icon: Dog },
  { id: 'brinquedoteca', label: 'Brinquedoteca', icon: Baby },
  { id: 'quadra', label: 'Quadra Poliesportiva', icon: TrendingUp },
  { id: 'rooftop', label: 'Rooftop', icon: Building },
  { id: 'portaria_24h', label: 'Portaria 24h', icon: Shield },
  { id: 'jardim', label: 'Jardim/Área Verde', icon: Trees },
  { id: 'spa', label: 'SPA / Sauna', icon: Waves },
  { id: 'cinema', label: 'Cinema/Home Theater', icon: Users },
  { id: 'playground', label: 'Playground', icon: Baby },
  { id: 'churrasqueira', label: 'Churrasqueira', icon: Utensils },
  { id: 'wifi_areas_comuns', label: 'Wi-Fi Áreas Comuns', icon: Wifi },
];

interface PropertyAmenitiesSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  readOnly?: boolean;
}

export const PropertyAmenitiesSelect = ({ value, onChange, readOnly = false }: PropertyAmenitiesSelectProps) => {
  const toggleAmenity = (amenityId: string) => {
    if (readOnly) return;
    
    if (value.includes(amenityId)) {
      onChange(value.filter(id => id !== amenityId));
    } else {
      onChange([...value, amenityId]);
    }
  };

  if (readOnly) {
    const selectedAmenities = AMENITIES_OPTIONS.filter(a => value.includes(a.id));
    
    if (selectedAmenities.length === 0) {
      return <p className="text-sm text-muted-foreground">Nenhuma infraestrutura cadastrada</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selectedAmenities.map(amenity => {
          const Icon = amenity.icon;
          return (
            <Badge key={amenity.id} variant="secondary" className="gap-1.5 py-1">
              <Icon className="h-3.5 w-3.5" />
              {amenity.label}
            </Badge>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Infraestrutura / Áreas Comuns</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {AMENITIES_OPTIONS.map(amenity => {
          const Icon = amenity.icon;
          const isSelected = value.includes(amenity.id);
          
          return (
            <Button
              key={amenity.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "justify-start gap-2 h-auto py-2 text-xs",
                isSelected && "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleAmenity(amenity.id)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{amenity.label}</span>
              {isSelected && <Check className="h-3 w-3 ml-auto shrink-0" />}
            </Button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {value.length} item{value.length !== 1 ? 's' : ''} selecionado{value.length !== 1 ? 's' : ''}
          </span>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange([])}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
};
