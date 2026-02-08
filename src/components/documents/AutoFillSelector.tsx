import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wand2, User, Building, Home, Users } from 'lucide-react';
import { useAutoFillData, Lead, Property, Unit, Owner } from '@/hooks/useAutoFillData';

interface AutoFillSelectorProps {
  onAutoFill: (fields: Record<string, string>) => void;
}

export const AutoFillSelector = ({ onAutoFill }: AutoFillSelectorProps) => {
  const {
    leads,
    properties,
    units,
    owners,
    profile,
    mapLeadToFields,
    mapPropertyToFields,
    mapUnitToFields,
    mapOwnerToFields,
    mapProfileToFields,
  } = useAutoFillData();

  const handleLeadSelect = (lead: Lead) => {
    onAutoFill(mapLeadToFields(lead));
  };

  const handlePropertySelect = (property: Property) => {
    onAutoFill(mapPropertyToFields(property));
  };

  const handleUnitSelect = (unit: Unit) => {
    onAutoFill(mapUnitToFields(unit));
  };

  const handleOwnerSelect = (owner: Owner) => {
    onAutoFill(mapOwnerToFields(owner));
  };

  const handleProfileFill = () => {
    if (profile) {
      onAutoFill(mapProfileToFields(profile));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="mr-2 h-4 w-4" />
          Preencher Automático
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Preencher com dados do CRM</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Leads */}
        {leads.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <User className="mr-2 h-4 w-4" />
              Leads / Clientes
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
              {leads.map((lead) => (
                <DropdownMenuItem key={lead.id} onClick={() => handleLeadSelect(lead)}>
                  {lead.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Properties */}
        {properties.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Building className="mr-2 h-4 w-4" />
              Empreendimentos
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
              {properties.map((property) => (
                <DropdownMenuItem key={property.id} onClick={() => handlePropertySelect(property)}>
                  {property.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Units */}
        {units.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Home className="mr-2 h-4 w-4" />
              Unidades
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
              {units.map((unit) => (
                <DropdownMenuItem key={unit.id} onClick={() => handleUnitSelect(unit)}>
                  {unit.property_name ? `${unit.property_name} - ` : ''}
                  {unit.unit_number}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Owners */}
        {owners.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Users className="mr-2 h-4 w-4" />
              Proprietários
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
              {owners.map((owner) => (
                <DropdownMenuItem key={owner.id} onClick={() => handleOwnerSelect(owner)}>
                  {owner.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />

        {/* My Profile */}
        {profile && (
          <DropdownMenuItem onClick={handleProfileFill}>
            <User className="mr-2 h-4 w-4" />
            Meus dados (Corretor)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
