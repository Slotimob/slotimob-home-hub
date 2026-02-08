import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Building2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LinkedAsset {
  id: string;
  name: string;
  type: 'property' | 'unit';
  details?: string;
}

interface LeadAssetsPreviewProps {
  leadId: string;
}

export function LeadAssetsPreview({ leadId }: LeadAssetsPreviewProps) {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<LinkedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, [leadId]);

  const loadAssets = async () => {
    try {
      // Load properties linked to this lead
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, name, city')
        .eq('lead_id', leadId);

      if (propError) throw propError;

      // Load units linked to this lead
      const { data: units, error: unitError } = await supabase
        .from('units')
        .select('id, unit_number, properties:property_id(name)')
        .eq('lead_id', leadId);

      if (unitError) throw unitError;

      const linkedAssets: LinkedAsset[] = [];

      // Add properties
      (properties || []).forEach(prop => {
        linkedAssets.push({
          id: prop.id,
          name: prop.name,
          type: 'property',
          details: prop.city || undefined,
        });
      });

      // Add units
      (units || []).forEach(unit => {
        const propName = (unit.properties as any)?.name || '';
        linkedAssets.push({
          id: unit.id,
          name: `Unidade ${unit.unit_number}`,
          type: 'unit',
          details: propName,
        });
      });

      setAssets(linkedAssets);
    } catch (error) {
      console.error('Error loading linked assets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">Imóveis vinculados</span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {assets.length}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {assets.slice(0, 3).map((asset) => (
          <Badge
            key={`${asset.type}-${asset.id}`}
            variant="outline"
            className="text-xs cursor-pointer hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (asset.type === 'property') {
                navigate('/properties');
              } else {
                navigate('/units');
              }
            }}
          >
            {asset.type === 'property' ? (
              <Building2 className="h-3 w-3 mr-1" />
            ) : (
              <Home className="h-3 w-3 mr-1" />
            )}
            <span className="truncate max-w-[100px]">{asset.name}</span>
          </Badge>
        ))}
        {assets.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{assets.length - 3}
          </Badge>
        )}
      </div>
    </div>
  );
}
