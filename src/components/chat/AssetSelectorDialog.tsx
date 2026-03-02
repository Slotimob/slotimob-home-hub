import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Home, Layers, Search, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export interface SelectedAsset {
  id: string;
  type: 'property' | 'unit' | 'standalone';
  label: string;
}

interface AssetItem {
  id: string;
  type: 'property' | 'unit' | 'standalone';
  label: string;
  subtitle: string;
}

interface AssetSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: SelectedAsset[];
  onConfirm: (selected: SelectedAsset[]) => void;
  maxItems?: number;
}

const TYPE_CONFIG = {
  property: { label: 'Empreendimento', icon: Building2, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  unit: { label: 'Unidade', icon: Layers, color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  standalone: { label: 'Avulso', icon: Home, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

export function AssetSelectorDialog({ open, onOpenChange, selected, onConfirm, maxItems = 5 }: AssetSelectorDialogProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<SelectedAsset[]>(selected);

  useEffect(() => {
    if (open) {
      setLocalSelected(selected);
      setSearch('');
      loadAssets();
    }
  }, [open]);

  const loadAssets = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [propertiesRes, unitsRes] = await Promise.all([
        supabase.from('properties').select('id, name, city').order('name'),
        supabase.from('units').select('id, unit_number, is_standalone, city, neighborhood, address, property:properties(name)').order('unit_number'),
      ]);

      const items: AssetItem[] = [];

      (propertiesRes.data || []).forEach(p => {
        items.push({
          id: p.id,
          type: 'property',
          label: p.name,
          subtitle: p.city || 'Empreendimento',
        });
      });

      (unitsRes.data || []).forEach(u => {
        const isStandalone = u.is_standalone === true;
        items.push({
          id: u.id,
          type: isStandalone ? 'standalone' : 'unit',
          label: isStandalone
            ? (u.unit_number || u.address || 'Imóvel Avulso')
            : `${u.unit_number || 'Unidade'} - ${(u.property as any)?.name || 'Sem empreendimento'}`,
          subtitle: [u.neighborhood, u.city].filter(Boolean).join(', ') || (isStandalone ? 'Imóvel Avulso' : 'Unidade'),
        });
      });

      setAssets(items);
    } catch {
      toast.error('Erro ao carregar imóveis');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (item: AssetItem) => {
    setLocalSelected(prev => {
      const exists = prev.find(s => s.id === item.id && s.type === item.type);
      if (exists) return prev.filter(s => !(s.id === item.id && s.type === item.type));
      if (prev.length >= maxItems) {
        toast.warning(`Máximo de ${maxItems} imóveis permitidos`);
        return prev;
      }
      return [...prev, { id: item.id, type: item.type, label: item.label }];
    });
  };

  const isSelected = (item: AssetItem) => localSelected.some(s => s.id === item.id && s.type === item.type);

  const filtered = assets.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Anexar Imóveis ao Contexto</DialogTitle>
          <DialogDescription>
            Selecione até {maxItems} imóveis para incluir como contexto na conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar imóvel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {localSelected.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Selecionar contexto consome mais créditos de IA.</span>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto pr-2 flex flex-col gap-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum imóvel encontrado.</p>
          ) : (
            <>
              {filtered.map(item => {
                const config = TYPE_CONFIG[item.type];
                const Icon = config.icon;
                const checked = isSelected(item);
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => toggleItem(item)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      checked ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${config.color}`}>
                      {config.label}
                    </Badge>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground self-center">
            {localSelected.length} / {maxItems} selecionados
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => { onConfirm(localSelected); onOpenChange(false); }}>
              Confirmar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
