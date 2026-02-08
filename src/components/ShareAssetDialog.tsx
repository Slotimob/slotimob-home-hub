import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Copy, 
  Download, 
  Share2, 
  Search, 
  Building2, 
  Home, 
  Loader2,
  Check,
  ExternalLink,
  FileText,
  Calculator
} from 'lucide-react';
import { 
  generatePropertyPDF, 
  type PDFAssetData, 
  type FinancingSimulation,
  buildPDFDataFromUnit, 
  buildPDFDataFromStandalone 
} from '@/utils/propertyPdfGenerator';

export type ShareMode = 'property_unit' | 'standalone';

interface ShareAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ShareMode;
  /** Pre-selected asset ID (optional) */
  preSelectedId?: string;
  /** Pre-loaded asset data (optional, to avoid re-fetching) */
  preSelectedData?: any;
}

interface UnitOption {
  id: string;
  unit_number: string;
  property_id: string | null;
  property_name: string | null;
  price: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  property_type: string | null;
  is_standalone: boolean;
}

// PMT calculation helper
function calculatePMT(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
         (Math.pow(1 + monthlyRate, months) - 1);
}

export function ShareAssetDialog({
  open,
  onOpenChange,
  mode,
  preSelectedId,
  preSelectedData,
}: ShareAssetDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Financing simulation state
  const [includeFinancing, setIncludeFinancing] = useState(false);
  const [downPaymentPercent, setDownPaymentPercent] = useState('20');
  const [interestRate, setInterestRate] = useState('10');
  const financingMonths = 360; // 30 years default

  // Calculate financing preview with safe defaults to prevent NaN
  const financingPreview = useMemo(() => {
    if (!selectedUnit?.price || !includeFinancing) return null;
    
    const price = selectedUnit.price;
    // Safe parsing with fallback to default values to prevent NaN
    const downPercent = parseFloat(downPaymentPercent) || 20;
    const rate = parseFloat(interestRate) || 10;
    
    // Validate ranges
    if (downPercent < 0 || downPercent > 100 || rate <= 0 || price <= 0) return null;
    
    const downPayment = (price * downPercent) / 100;
    const financedAmount = price - downPayment;
    
    // Prevent division by zero or negative values
    if (financedAmount <= 0) return null;
    
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = calculatePMT(financedAmount, monthlyRate, financingMonths);
    
    // Validate result is a valid number
    if (!isFinite(monthlyPayment) || isNaN(monthlyPayment)) return null;
    
    return {
      downPaymentPercent: downPercent,
      downPayment,
      financedAmount,
      monthlyPayment,
      months: financingMonths,
      annualRate: rate,
    };
  }, [selectedUnit?.price, includeFinancing, downPaymentPercent, interestRate]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedUnit(null);
      setIncludeFinancing(false);
      setDownPaymentPercent('20');
      setInterestRate('10');
    }
  }, [open]);

  // Load units based on mode
  useEffect(() => {
    if (!open || !user) return;

    const loadUnits = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('units')
          .select(`
            id,
            unit_number,
            property_id,
            price,
            address,
            neighborhood,
            city,
            property_type,
            is_standalone,
            property:properties(name)
          `)
          .eq('broker_id', user.id)
          .order('created_at', { ascending: false });

        if (mode === 'standalone') {
          // Only standalone properties (no parent development)
          query = query.eq('is_standalone', true);
        } else {
          // Only units that belong to a property (have property_id)
          query = query.or('is_standalone.is.null,is_standalone.eq.false').not('property_id', 'is', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        const mappedUnits: UnitOption[] = (data || []).map((u: any) => ({
          id: u.id,
          unit_number: u.unit_number,
          property_id: u.property_id,
          property_name: u.property?.name || null,
          price: u.price,
          address: u.address,
          neighborhood: u.neighborhood,
          city: u.city,
          property_type: u.property_type,
          is_standalone: u.is_standalone || false,
        }));

        setUnits(mappedUnits);

        // Auto-select if preSelectedId is provided
        if (preSelectedId) {
          const found = mappedUnits.find((u) => u.id === preSelectedId);
          if (found) {
            setSelectedUnit(found);
          }
        }
      } catch (error: any) {
        toast({
          title: 'Erro ao carregar imóveis',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [open, user, mode, preSelectedId, toast]);

  // Filter units by search
  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return units;
    const term = searchTerm.toLowerCase();
    return units.filter((u) => {
      const searchableText = [
        u.unit_number,
        u.property_name,
        u.address,
        u.neighborhood,
        u.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(term);
    });
  }, [units, searchTerm]);

  // Group units by property (for property_unit mode)
  const groupedUnits = useMemo(() => {
    if (mode === 'standalone') return null;
    
    const groups: Record<string, UnitOption[]> = {};
    filteredUnits.forEach((u) => {
      const key = u.property_name || 'Sem Empreendimento';
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });
    return groups;
  }, [filteredUnits, mode]);

  const handleCopyLink = async () => {
    if (!selectedUnit) return;
    const url = `${window.location.origin}/imovel/${selectedUnit.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link copiado!',
      description: 'O link do imóvel foi copiado para a área de transferência.',
    });
  };

  const handleGeneratePDF = async () => {
    if (!selectedUnit) return;

    // Validate price if financing is enabled
    if (includeFinancing && (!selectedUnit.price || selectedUnit.price <= 0)) {
      toast({
        title: 'Valor inválido',
        description: 'O imóvel precisa ter um valor definido para incluir a simulação.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      toast({
        title: 'Gerando PDF...',
        description: 'Aguarde enquanto criamos a apresentação.',
      });

      // Fetch full unit data
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', selectedUnit.id)
        .single();

      if (unitError) throw unitError;

      let pdfData: PDFAssetData;

      if (mode === 'property_unit' && unitData.property_id) {
        // Fetch parent property data
        const { data: propertyData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', unitData.property_id)
          .single();

        if (propError) throw propError;

        pdfData = buildPDFDataFromUnit(unitData, propertyData);
      } else {
        // Standalone - no parent property
        pdfData = buildPDFDataFromStandalone(unitData);
      }

      // Add financing simulation if enabled
      if (includeFinancing && financingPreview) {
        pdfData.financingSimulation = financingPreview;
      }

      generatePropertyPDF(pdfData);

      toast({
        title: 'PDF gerado!',
        description: 'A apresentação do imóvel foi baixada.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDisplayName = (unit: UnitOption) => {
    if (mode === 'standalone') {
      const parts = [unit.neighborhood, unit.city].filter(Boolean);
      const location = parts.length > 0 ? parts.join(', ') : '';
      return location ? `${unit.unit_number} - ${location}` : unit.unit_number;
    }
    return unit.property_name 
      ? `${unit.property_name} - ${unit.unit_number}` 
      : unit.unit_number;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {mode === 'standalone' ? 'Compartilhar Imóvel' : 'Compartilhar Unidade'}
          </DialogTitle>
          <DialogDescription>
            Selecione {mode === 'standalone' ? 'um imóvel' : 'uma unidade'} para gerar o link ou PDF de apresentação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 max-h-[calc(80vh-140px)] [&>div>div]:!block">
            <div className="px-4 sm:px-6 py-4 pr-6 flex flex-col gap-4">
              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={mode === 'standalone' ? 'Buscar imóvel...' : 'Buscar unidade ou empreendimento...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Label for selection */}
              <Label className="text-sm font-medium">
                {mode === 'standalone' ? 'Selecionar Imóvel' : 'Selecionar Unidade'}
              </Label>

              {/* Units List */}
              <div className="border rounded-lg min-h-[120px] max-h-[180px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUnits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    {mode === 'standalone' ? (
                      <Home className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum imóvel cadastrado'}
                    </p>
                  </div>
                ) : mode === 'standalone' ? (
                  // Flat list for standalone
                  <div className="p-2 space-y-1">
                    {filteredUnits.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit)}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                          selectedUnit?.id === unit.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{unit.unit_number}</p>
                            {(unit.neighborhood || unit.city) && (
                              <p className={`text-xs truncate ${
                                selectedUnit?.id === unit.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                              }`}>
                                {[unit.neighborhood, unit.city].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                          {unit.price && (
                            <Badge variant={selectedUnit?.id === unit.id ? 'secondary' : 'outline'} className="text-xs shrink-0">
                              {formatPrice(unit.price)}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  // Grouped list for property_unit
                  <div className="p-2">
                    {groupedUnits && Object.entries(groupedUnits).map(([propertyName, propertyUnits]) => (
                      <div key={propertyName} className="mb-3 last:mb-0">
                        <div className="flex items-center gap-2 px-2 py-1 mb-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">{propertyName}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {propertyUnits.length}
                          </Badge>
                        </div>
                        <div className="space-y-0.5 ml-5">
                          {propertyUnits.map((unit) => (
                            <button
                              key={unit.id}
                              onClick={() => setSelectedUnit(unit)}
                              className={`w-full text-left p-2 rounded-lg transition-colors ${
                                selectedUnit?.id === unit.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm">{unit.unit_number}</span>
                                {unit.price && (
                                  <Badge variant={selectedUnit?.id === unit.id ? 'secondary' : 'outline'} className="text-xs">
                                    {formatPrice(unit.price)}
                                  </Badge>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Unit Actions */}
              {selectedUnit && (
                <>
                  <Separator />
                  <div className="space-y-3 flex-shrink-0">
                    <Label className="text-xs text-muted-foreground">
                      {mode === 'standalone' ? 'Imóvel selecionado:' : 'Unidade selecionada:'}
                    </Label>
                    <div className="p-2.5 bg-muted rounded-lg">
                      <p className="font-semibold text-sm">{getDisplayName(selectedUnit)}</p>
                      {selectedUnit.price && (
                        <p className="text-xs text-muted-foreground">{formatPrice(selectedUnit.price)}</p>
                      )}
                    </div>

                    {/* Financing Simulation Option */}
                    <div className="space-y-3 p-3 border rounded-lg bg-card">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-financing"
                          checked={includeFinancing}
                          onCheckedChange={(checked) => setIncludeFinancing(checked === true)}
                        />
                        <Label htmlFor="include-financing" className="flex items-center gap-2 cursor-pointer text-sm">
                          <Calculator className="h-4 w-4" />
                          Incluir Simulação de Financiamento?
                        </Label>
                      </div>

                      {includeFinancing && (
                        <div className="space-y-3 pl-6 pt-2">
                          {/* Validation warning */}
                          {(!selectedUnit.price || selectedUnit.price <= 0) && (
                            <p className="text-xs text-destructive">
                              ⚠️ Este imóvel não possui valor definido.
                            </p>
                          )}
                          
                          {/* Responsive grid: 2 cols always to save vertical space */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="down-payment" className="text-xs">% de Entrada</Label>
                              <Input
                                id="down-payment"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={downPaymentPercent}
                                onChange={(e) => setDownPaymentPercent(e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="interest-rate" className="text-xs">Taxa Anual (%)</Label>
                              <Input
                                id="interest-rate"
                                type="number"
                                min="0"
                                max="30"
                                step="0.1"
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          {/* Real-time Preview */}
                          {financingPreview && selectedUnit.price && selectedUnit.price > 0 && (
                            <div className="p-2 bg-primary/10 rounded-md space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Entrada:</span>
                                <span className="font-medium">{formatPrice(financingPreview.downPayment)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Financiado:</span>
                                <span className="font-medium">{formatPrice(financingPreview.financedAmount)}</span>
                              </div>
                              <Separator className="my-1" />
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-primary">Parcela:</span>
                                <span className="font-bold text-primary">{formatPrice(financingPreview.monthlyPayment)}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground text-center">
                                ({financingPreview.months}x / {financingPreview.annualRate}% a.a.)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Fixed Footer Actions - Always visible */}
          {selectedUnit && (
            <div className="px-4 sm:px-6 py-3 border-t bg-background flex-shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="gap-2 h-9"
                  size="sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="hidden sm:inline">Copiado!</span>
                      <span className="sm:hidden">OK</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copiar Link</span>
                      <span className="sm:hidden">Link</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={generating || (includeFinancing && (!selectedUnit.price || selectedUnit.price <= 0))}
                  className="gap-2 h-9"
                  size="sm"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Gerando...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Gerar PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
