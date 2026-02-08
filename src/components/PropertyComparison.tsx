import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Home, DollarSign, Ruler, Bed, Bath } from 'lucide-react';

interface Unit {
  id: string;
  unit_number: string;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  condo_fee: number | null;
  iptu: number | null;
  property: {
    name: string;
    city: string | null;
    state: string | null;
  };
}

export const PropertyComparison = () => {
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unit1Id, setUnit1Id] = useState('');
  const [unit2Id, setUnit2Id] = useState('');
  const [unit1, setUnit1] = useState<Unit | null>(null);
  const [unit2, setUnit2] = useState<Unit | null>(null);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*, property:properties(name, city, state)')
        .eq('status', 'available')
        .order('unit_number');

      if (error) throw error;
      setUnits(data as Unit[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar unidades',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCompare = () => {
    const u1 = units.find((u) => u.id === unit1Id);
    const u2 = units.find((u) => u.id === unit2Id);

    if (u1 && u2) {
      setUnit1(u1);
      setUnit2(u2);
    }
  };

  const ComparisonRow = ({ label, value1, value2, icon: Icon }: { label: string; value1: string; value2: string; icon?: any }) => (
    <div className="grid grid-cols-3 gap-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label}
      </div>
      <div className="text-sm">{value1}</div>
      <div className="text-sm">{value2}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unit1">Unidade 1</Label>
          <Select value={unit1Id} onValueChange={setUnit1Id}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a primeira unidade" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.property.name} - Un. {unit.unit_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit2">Unidade 2</Label>
          <Select value={unit2Id} onValueChange={setUnit2Id}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a segunda unidade" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id} disabled={unit.id === unit1Id}>
                  {unit.property.name} - Un. {unit.unit_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleCompare} className="w-full" disabled={!unit1Id || !unit2Id}>
        Comparar Unidades
      </Button>

      {unit1 && unit2 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 pb-3 font-semibold text-sm border-b">
              <div>Característica</div>
              <div className="text-primary">{unit1.property.name}</div>
              <div className="text-primary">{unit2.property.name}</div>
            </div>

            <ComparisonRow
              label="Unidade"
              value1={unit1.unit_number}
              value2={unit2.unit_number}
              icon={Home}
            />
            <Separator />

            <ComparisonRow
              label="Localização"
              value1={unit1.property.city && unit1.property.state ? `${unit1.property.city}, ${unit1.property.state}` : 'N/A'}
              value2={unit2.property.city && unit2.property.state ? `${unit2.property.city}, ${unit2.property.state}` : 'N/A'}
            />
            <Separator />

            <ComparisonRow
              label="Preço"
              value1={unit1.price ? `R$ ${unit1.price.toLocaleString('pt-BR')}` : 'N/A'}
              value2={unit2.price ? `R$ ${unit2.price.toLocaleString('pt-BR')}` : 'N/A'}
              icon={DollarSign}
            />
            <Separator />

            <ComparisonRow
              label="Área"
              value1={unit1.area ? `${unit1.area}m²` : 'N/A'}
              value2={unit2.area ? `${unit2.area}m²` : 'N/A'}
              icon={Ruler}
            />
            <Separator />

            <ComparisonRow
              label="Quartos"
              value1={unit1.bedrooms?.toString() || 'N/A'}
              value2={unit2.bedrooms?.toString() || 'N/A'}
              icon={Bed}
            />
            <Separator />

            <ComparisonRow
              label="Banheiros"
              value1={unit1.bathrooms?.toString() || 'N/A'}
              value2={unit2.bathrooms?.toString() || 'N/A'}
              icon={Bath}
            />
            <Separator />

            <ComparisonRow
              label="Condomínio"
              value1={unit1.condo_fee ? `R$ ${unit1.condo_fee.toLocaleString('pt-BR')}` : 'N/A'}
              value2={unit2.condo_fee ? `R$ ${unit2.condo_fee.toLocaleString('pt-BR')}` : 'N/A'}
            />
            <Separator />

            <ComparisonRow
              label="IPTU"
              value1={unit1.iptu ? `R$ ${unit1.iptu.toLocaleString('pt-BR')}` : 'N/A'}
              value2={unit2.iptu ? `R$ ${unit2.iptu.toLocaleString('pt-BR')}` : 'N/A'}
            />
            <Separator />

            {unit1.price && unit2.price && unit1.area && unit2.area && (
              <>
                <ComparisonRow
                  label="Preço/m²"
                  value1={`R$ ${(unit1.price / unit1.area).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`}
                  value2={`R$ ${(unit2.price / unit2.area).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
