import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { buildAssetReport, type AssetReportSections, type AssetReportData } from '@/lib/asset-report-data';

interface RAReportConfigDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** `from: null` = all history */
  dateRange: { from: Date | null; to: Date };
  onGenerate: (data: AssetReportData) => void;
  /** Pre-select specific asset(s) */
  preSelectedAssetIds?: string[];
  /** When opened from an asset detail page, restricts the picker to that asset type */
  preSelectedAssetType?: 'property' | 'unit';
  formatLabel?: string;
}

interface AssetOption {
  id: string;
  label: string;
  type: 'property' | 'unit';
}

export function RAReportConfigDialog({
  open,
  onOpenChange,
  dateRange,
  onGenerate,
  preSelectedAssetIds,
  preSelectedAssetType,
  formatLabel,
}: RAReportConfigDialogProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const [mode, setMode] = useState<'all' | 'specific'>(preSelectedAssetIds?.length ? 'specific' : 'all');
  const [selectedIds, setSelectedIds] = useState<string[]>(preSelectedAssetIds || []);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [sections, setSections] = useState<AssetReportSections>({
    acquisition: true,
    market: true,
    expenses: true,
    income: true,
    activities: true,
    improvements: true,
  });

  const { data: assetOptions = [] } = useQuery({
    queryKey: ['asset-options-for-report', effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveBrokerId) return [];
      const [{ data: props }, { data: units }] = await Promise.all([
        supabase.from('properties').select('id, name, address').eq('broker_id', effectiveBrokerId),
        supabase.from('units').select('id, unit_number, address, property:properties(name)').eq('broker_id', effectiveBrokerId),
      ]);
      const options: AssetOption[] = [];
      for (const p of props || []) {
        options.push({ id: p.id, label: p.name || p.address || 'Imóvel', type: 'property' });
      }
      for (const u of units || []) {
        const propName = (u as any).property?.name || '';
        options.push({
          id: u.id,
          label: u.unit_number ? `${propName ? propName + ' — ' : ''}${u.unit_number}` : propName || 'Unidade',
          type: 'unit',
        });
      }
      return options;
    },
    enabled: open && !!effectiveBrokerId,
  });

  const typeScoped = preSelectedAssetType
    ? assetOptions.filter(a => a.type === preSelectedAssetType || preSelectedAssetIds?.includes(a.id))
    : assetOptions;

  const filtered = search
    ? typeScoped.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))
    : typeScoped;

  const toggleId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSection = (key: keyof AssetReportSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!effectiveBrokerId) return;
    setLoading(true);
    try {
      const data = await buildAssetReport({
        brokerId: effectiveBrokerId,
        assetIds: mode === 'specific' ? selectedIds : undefined,
        period: dateRange,
        sections,
      });
      onGenerate(data);
      onOpenChange(false);
    } catch (e) {
      console.error('Error building report:', e);
    } finally {
      setLoading(false);
    }
  };

  const sectionChecks: Array<{ key: keyof AssetReportSections; label: string }> = [
    { key: 'acquisition', label: 'Dados de aquisição' },
    { key: 'market', label: 'Valor de mercado e valorização' },
    { key: 'expenses', label: 'Despesas (com breakdown por categoria)' },
    { key: 'income', label: 'Receitas' },
    { key: 'activities', label: 'Atividades e movimentações (log detalhado com usuário e alterações)' },
    { key: 'improvements', label: 'Benfeitorias no período' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório Completo do Imóvel{formatLabel ? ` (${formatLabel})` : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Asset selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Imóveis a incluir</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'all' | 'specific')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="ra-all" />
                <Label htmlFor="ra-all" className="text-sm cursor-pointer">Todos os imóveis</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="specific" id="ra-specific" />
                <Label htmlFor="ra-specific" className="text-sm cursor-pointer">Selecionar específicos</Label>
              </div>
            </RadioGroup>

            {mode === 'specific' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar imóvel..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 text-sm h-9"
                  />
                </div>
                {selectedIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedIds.map(id => {
                      const opt = assetOptions.find(a => a.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs gap-1">
                          {opt?.label || id.slice(0, 8)}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => toggleId(id)} />
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">Nenhum imóvel encontrado</p>
                  ) : (
                    filtered.map(opt => (
                      <div
                        key={opt.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => toggleId(opt.id)}
                      >
                        <Checkbox checked={selectedIds.includes(opt.id)} className="pointer-events-none" />
                        <span className="flex-1 truncate">{opt.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {opt.type === 'property' ? 'Imóvel' : 'Unidade'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Period info */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Período</Label>
            <p className="text-sm text-muted-foreground">
              {dateRange.from
                ? `${dateRange.from.toLocaleDateString('pt-BR')} — ${dateRange.to.toLocaleDateString('pt-BR')}`
                : `Todo o histórico (até ${dateRange.to.toLocaleDateString('pt-BR')})`}
            </p>
            <p className="text-[11px] text-muted-foreground">Altere o período nos filtros da página de relatórios.</p>
          </div>

          {/* Section checkboxes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">O que incluir</Label>
            {sectionChecks.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`sec-${key}`}
                  checked={sections[key]}
                  onCheckedChange={() => toggleSection(key)}
                />
                <Label htmlFor={`sec-${key}`} className="text-sm cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading || (mode === 'specific' && selectedIds.length === 0)}>
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
