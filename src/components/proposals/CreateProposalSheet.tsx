import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useProposals, type CreateProposalInput } from '@/hooks/useProposals';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Loader2,
  Calculator,
  User,
  Image as ImageIcon,
  Building2,
  Sparkles,
} from 'lucide-react';
import {
  generatePropertyPDF,
  buildPDFDataFromUnit,
  buildPDFDataFromStandalone,
  type AgentInfo,
} from '@/utils/propertyPdfGenerator';

interface CreateProposalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedUnitId?: string;
}

interface UnitOption {
  id: string;
  unit_number: string;
  property_id: string | null;
  property_name: string | null;
  price: number | null;
  is_standalone: boolean;
  cover_image_url: string | null;
}

export function CreateProposalSheet({ open, onOpenChange, preSelectedUnitId }: CreateProposalSheetProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { createProposal } = useProposals();
  const { toast } = useToast();

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [introMessage, setIntroMessage] = useState('');
  const [includeFinancing, setIncludeFinancing] = useState(false);
  const [includeCover, setIncludeCover] = useState(true);

  // Load units
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingUnits(true);
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, property_id, price, is_standalone, cover_image_url, property:properties(name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        setUnits(
          data.map((u: any) => ({
            id: u.id,
            unit_number: u.unit_number,
            property_id: u.property_id,
            property_name: u.property?.name || null,
            price: u.price,
            is_standalone: u.is_standalone || false,
            cover_image_url: u.cover_image_url,
          }))
        );
      }
      setLoadingUnits(false);
    };
    load();
  }, [open]);

  // Pre-select unit
  useEffect(() => {
    if (preSelectedUnitId && open) {
      setSelectedUnitId(preSelectedUnitId);
    }
  }, [preSelectedUnitId, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedUnitId('');
      setLeadName('');
      setIntroMessage('');
      setIncludeFinancing(false);
      setIncludeCover(true);
    }
  }, [open]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedUnitId) || null,
    [units, selectedUnitId]
  );

  const formatPrice = (v: number | null) =>
    v
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
      : null;

  const handleGenerate = async () => {
    if (!selectedUnit) {
      toast({ title: 'Selecione um imóvel', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      // Fetch full unit data
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', selectedUnit.id)
        .single();
      if (unitError) throw unitError;

      let pdfData;
      if (!selectedUnit.is_standalone && unitData.property_id) {
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', unitData.property_id)
          .single();
        if (propError) throw propError;
        pdfData = buildPDFDataFromUnit(unitData, propData);
      } else {
        pdfData = buildPDFDataFromStandalone(unitData);
      }

      // Add financing if enabled
      if (includeFinancing && selectedUnit.price) {
        const price = selectedUnit.price;
        const downPercent = 20;
        const rate = 10.5;
        const months = 360;
        const downPayment = (price * downPercent) / 100;
        const financedAmount = price - downPayment;
        const monthlyRate = rate / 100 / 12;
        const monthlyPayment =
          (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);

        pdfData.financingSimulation = {
          downPaymentPercent: downPercent,
          downPayment,
          financedAmount,
          monthlyPayment,
          months,
          annualRate: rate,
        };
      }

      // Add lead name to title if provided
      if (leadName.trim()) {
        pdfData.leadName = leadName.trim();
      }

      // Add introduction message
      if (introMessage.trim()) {
        pdfData.introductionMessage = introMessage.trim();
      }

      // Get agent info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone, creci')
        .eq('id', user?.id || '')
        .single();

      const agent: AgentInfo = {
        name: profile?.full_name || 'Corretor',
        email: profile?.email || undefined,
        phone: profile?.phone || undefined,
      };

      await generatePropertyPDF(pdfData, agent);

      // Save to proposals history
      await createProposal.mutateAsync({
        property_id: selectedUnit.property_id,
        unit_id: selectedUnit.id,
        lead_name: leadName.trim() || undefined,
        introduction_message: introMessage.trim() || undefined,
        include_financing: includeFinancing,
        include_cover: includeCover,
        status: 'draft',
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro ao gerar proposta', description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nova Proposta Comercial
          </SheetTitle>
          <SheetDescription>
            Gere uma proposta premium personalizada para o seu cliente.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {/* Unit Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Imóvel *
              </Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUnits ? 'Carregando...' : 'Selecione o imóvel'} />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        {u.property_name
                          ? `${u.property_name} - ${u.unit_number}`
                          : u.unit_number}
                        {u.price && (
                          <span className="text-muted-foreground text-xs">
                            {formatPrice(u.price)}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUnit && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedUnit.property_name
                        ? `${selectedUnit.property_name} - ${selectedUnit.unit_number}`
                        : selectedUnit.unit_number}
                    </span>
                    {selectedUnit.price && (
                      <Badge variant="secondary">{formatPrice(selectedUnit.price)}</Badge>
                    )}
                  </div>
                  {selectedUnit.cover_image_url && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                      Imagem de capa disponível
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Lead Name */}
            <div className="space-y-2">
              <Label htmlFor="lead-name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Nome do Cliente/Lead
              </Label>
              <Input
                id="lead-name"
                placeholder="Ex: João Silva"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se preenchido, o nome aparecerá na capa da proposta.
              </p>
            </div>

            {/* Introduction Message */}
            <div className="space-y-2">
              <Label htmlFor="intro-msg" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Mensagem de Introdução
              </Label>
              <Textarea
                id="intro-msg"
                placeholder="Escreva uma mensagem personalizada para o cliente..."
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Será incluída no topo da proposta, logo após a capa.
              </p>
            </div>

            <Separator />

            {/* Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Opções da Proposta</h4>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Calculator className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Simulação de Financiamento</p>
                    <p className="text-xs text-muted-foreground">
                      Inclui tabela com cenários de entrada e parcelas
                    </p>
                  </div>
                </div>
                <Switch checked={includeFinancing} onCheckedChange={setIncludeFinancing} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Capa com Imagem</p>
                    <p className="text-xs text-muted-foreground">
                      Exibe a foto principal do imóvel na primeira página
                    </p>
                  </div>
                </div>
                <Switch checked={includeCover} onCheckedChange={setIncludeCover} />
              </div>
            </div>

            {/* Preview Summary */}
            {selectedUnit && (
              <>
                <Separator />
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  <h4 className="text-sm font-semibold text-primary">Resumo da Proposta</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>
                      📄 Imóvel:{' '}
                      {selectedUnit.property_name
                        ? `${selectedUnit.property_name} - ${selectedUnit.unit_number}`
                        : selectedUnit.unit_number}
                    </li>
                    {leadName && <li>👤 Cliente: {leadName}</li>}
                    {includeFinancing && <li>💰 Com simulação de financiamento</li>}
                    {includeCover && <li>🖼️ Com capa visual</li>}
                    {introMessage && <li>✍️ Com mensagem personalizada</li>}
                  </ul>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={!selectedUnit || generating}
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar Proposta
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
