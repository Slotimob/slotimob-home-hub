import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useProposals, type CreateProposalInput, type Proposal } from '@/hooks/useProposals';
import { useAICredits } from '@/hooks/useAICredits';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Image as ImageIcon,
  Building2,
  Sparkles,
  Wand2,
  Zap,
  Percent,
  Briefcase,
} from 'lucide-react';
import {
  generatePropertyPDF,
  buildPDFDataFromUnit,
  buildPDFDataFromStandalone,
  type AgentInfo,
  type PDFAssetData,
} from '@/utils/propertyPdfGenerator';
import { ProposalPdfTemplate } from './ProposalPdfTemplate';
import { ContactSelector } from '@/components/ContactSelector';

interface CreateProposalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedUnitId?: string;
  initialLeadName?: string;
  dealId?: string;
  editingProposal?: Proposal | null;
  onProposalGenerated?: (pdfBlob: Blob, proposalId: string) => void;
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

export function CreateProposalSheet({
  open,
  onOpenChange,
  preSelectedUnitId,
  initialLeadName,
  dealId,
  editingProposal,
  onProposalGenerated,
}: CreateProposalSheetProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { createProposal, updateProposal } = useProposals();
  const { credits } = useAICredits();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [leadName, setLeadName] = useState('');
  const [introMessage, setIntroMessage] = useState('');
  const [includeFinancing, setIncludeFinancing] = useState(false);
  const [includeCover, setIncludeCover] = useState(true);
  const [interestRate, setInterestRate] = useState('10.5');

  // Custom simulation fields
  const [includeCustomSim, setIncludeCustomSim] = useState(false);
  const [customBasePrice, setCustomBasePrice] = useState('');
  const [customDownPercent, setCustomDownPercent] = useState('20');
  const [customRate, setCustomRate] = useState('10.5');

  // Agent WhatsApp toggle
  const [includeAgentWhatsApp, setIncludeAgentWhatsApp] = useState(false);

  // PDF template ref + data
  const templateRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<PDFAssetData | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | undefined>();
  const [readyToCapture, setReadyToCapture] = useState(false);

  const isEditing = !!editingProposal;

  // Fetch deals for selected contact
  const { data: contactDeals } = useQuery({
    queryKey: ['contact-deals', selectedContactId],
    queryFn: async () => {
      if (!selectedContactId) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('id, stage, pipeline_type, lead:leads(name)')
        .eq('contact_id', selectedContactId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedContactId,
  });

  // Fetch contact name for leadName sync
  const { data: selectedContactData } = useQuery({
    queryKey: ['contact-name', selectedContactId],
    queryFn: async () => {
      if (!selectedContactId) return null;
      const { data } = await supabase
        .from('contacts')
        .select('name')
        .eq('id', selectedContactId)
        .single();
      return data;
    },
    enabled: !!selectedContactId,
  });

  // Sync leadName when contact changes
  useEffect(() => {
    if (selectedContactData?.name) {
      setLeadName(selectedContactData.name);
    }
  }, [selectedContactData]);

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

  // Initialize form
  useEffect(() => {
    if (!open) return;
    if (editingProposal) {
      setSelectedUnitId(editingProposal.unit_id || '');
      setLeadName(editingProposal.lead_name || '');
      setIntroMessage(editingProposal.introduction_message || '');
      setIncludeFinancing(editingProposal.include_financing);
      setIncludeCover(editingProposal.include_cover);
    } else {
      if (preSelectedUnitId) setSelectedUnitId(preSelectedUnitId);
      if (initialLeadName) setLeadName(initialLeadName);
    }
  }, [open, preSelectedUnitId, initialLeadName, editingProposal]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedUnitId('');
      setSelectedContactId(null);
      setSelectedDealId(null);
      setLeadName('');
      setIntroMessage('');
      setIncludeFinancing(false);
      setIncludeCover(true);
      setInterestRate('10.5');
      setIncludeCustomSim(false);
      setCustomBasePrice('');
      setCustomDownPercent('20');
      setCustomRate('10.5');
      setIncludeAgentWhatsApp(false);
      setPdfData(null);
      setReadyToCapture(false);
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

  // AI intro generation with robust parsing and full property context
  const handleGenerateAI = async () => {
    if (!selectedUnit) {
      toast({ title: 'Selecione um imóvel primeiro', variant: 'destructive' });
      return;
    }
    setGeneratingAI(true);
    try {
      // Fetch FULL unit data for rich context
      const { data: unitData } = await supabase
        .from('units')
        .select('*')
        .eq('id', selectedUnit.id)
        .single();

      let propertyContext = '';
      if (unitData?.property_id) {
        const { data: propData } = await supabase
          .from('properties')
          .select('name, description, address, city, state, amenities, builder_name')
          .eq('id', unitData.property_id)
          .single();
        if (propData) {
          propertyContext = ` Empreendimento: ${propData.name || 'N/A'}. ${propData.description || ''} Endereço: ${propData.address || 'N/A'}, ${propData.city || ''}/${propData.state || ''}. Construtora: ${propData.builder_name || 'N/A'}. Amenidades: ${(propData.amenities || []).join(', ') || 'N/A'}.`;
        }
      }

      const unitJson = unitData
        ? JSON.stringify({
            tipo: unitData.property_type,
            preco: unitData.price,
            area: unitData.area,
            quartos: unitData.bedrooms,
            suites: unitData.suites,
            vagas: unitData.parking_spots,
            bairro: unitData.neighborhood,
            cidade: unitData.city,
            mobilia: unitData.furnished,
            condicao: unitData.condition,
            condominio: unitData.condo_fee,
            iptu: unitData.iptu,
            orientacao_solar: unitData.solar_orientation,
          })
        : '{}';

      const clientRef = leadName ? ` O nome do cliente é ${leadName}.` : '';

      // Use chat-ai-suggest (returns JSON, not SSE stream like ai-chat)
      const promptContent = `Baseado nestes dados do imóvel: ${unitJson}.${propertyContext}${clientRef} Escreva uma mensagem de introdução persuasiva e profissional de 3 parágrafos curtos para oferecer este imóvel a um cliente final. Seja elegante, direto e destaque os pontos fortes. Responda apenas com a mensagem, sem markdown, sem aspas.`;

      const { data: rawResponse, error } = await supabase.functions.invoke('chat-ai-suggest', {
        body: {
          messages: [{ direction: 'incoming', content: promptContent }],
          contactName: leadName || 'Cliente',
          propertyContext: unitJson,
        },
      });

      if (error) throw error;

      // chat-ai-suggest returns { suggestion: "..." }
      const aiText = rawResponse?.suggestion || rawResponse?.text || rawResponse?.message || '';

      if (typeof aiText === 'string' && aiText.trim()) {
        setIntroMessage(aiText.trim());
        toast({ title: 'Texto gerado com IA!' });
      } else {
        console.error('AI Payload Error — could not parse response:', rawResponse);
        const fallback = `Confira esta excelente oportunidade que selecionei especialmente para você. Um imóvel com características únicas que atendem perfeitamente às suas necessidades.\n\nEste é um investimento seguro e com alto potencial de valorização, localizado em uma região privilegiada com toda a infraestrutura que você e sua família merecem.\n\nFicarei feliz em agendar uma visita para que você possa conhecer pessoalmente todos os diferenciais deste imóvel.`;
        setIntroMessage(fallback);
        toast({ title: 'Texto padrão inserido', description: 'A IA não retornou texto. Edite conforme desejar.' });
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast({ title: 'Erro ao gerar texto com IA', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Capture the rendered template and generate PDF
  useEffect(() => {
    if (!readyToCapture || !pdfData || !templateRef.current) return;

    let cancelled = false;

    const capture = async () => {
      try {
        const element = templateRef.current;
        if (!element || cancelled) return;

        const pdfBlob = await generatePropertyPDF(pdfData, agentInfo, {
          returnBlob: true,
          templateElement: element,
        });

        if (cancelled) return;

        let pdfUrl: string | null = null;
        if (pdfBlob) {
          const fileName = `${effectiveBrokerId}/${Date.now()}_proposta.pdf`;
          const { error: uploadErr } = await supabase.storage
            .from('proposals')
            .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('proposals').getPublicUrl(fileName);
            pdfUrl = urlData?.publicUrl || null;
          }
        }

        // Download
        if (pdfBlob) {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Proposta_${Date.now()}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }

        // Save to DB
        const proposalInput = {
          property_id: selectedUnit?.property_id,
          unit_id: selectedUnit?.id,
          deal_id: selectedDealId || dealId || (editingProposal as any)?.deal_id || undefined,
          lead_name: leadName.trim() || undefined,
          introduction_message: introMessage.trim() || undefined,
          include_financing: includeFinancing,
          include_cover: includeCover,
          status: 'draft' as const,
          pdf_url: pdfUrl || undefined,
        };

        if (isEditing && editingProposal) {
          await updateProposal.mutateAsync({ ...proposalInput, id: editingProposal.id });
        } else {
          const result = await createProposal.mutateAsync(proposalInput);
          if (pdfBlob && onProposalGenerated && result?.id) {
            onProposalGenerated(pdfBlob as Blob, result.id);
          }
        }

        // FASE 3: Insert deal_activity if a deal is linked
        const activeDealId = selectedDealId || dealId;
        if (activeDealId && effectiveBrokerId) {
          try {
            await supabase.from('deal_activities').insert({
              deal_id: activeDealId,
              broker_id: effectiveBrokerId,
              activity_type: 'note',
              title: 'Proposta Comercial Gerada',
              description: `Proposta vinculada ao imóvel ${selectedUnit?.property_name ? `${selectedUnit.property_name} - ${selectedUnit.unit_number}` : selectedUnit?.unit_number}. Cliente: ${leadName.trim() || 'N/A'}.`,
            });
            queryClient.invalidateQueries({ queryKey: ['deal-activities', activeDealId] });
          } catch (actErr) {
            console.error('Deal activity insert error (non-critical):', actErr);
          }
        }

        toast({ title: 'Proposta gerada com sucesso!' });
        onOpenChange(false);
      } catch (error: any) {
        toast({ title: 'Erro ao gerar proposta', description: error.message, variant: 'destructive' });
      } finally {
        setGenerating(false);
        setReadyToCapture(false);
        setPdfData(null);
      }
    };

    const timer = setTimeout(capture, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [readyToCapture, pdfData]);

  const handleGenerate = async () => {
    if (!selectedUnit) {
      toast({ title: 'Selecione um imóvel', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', selectedUnit.id)
        .single();
      if (unitError) throw unitError;

      let buildData: PDFAssetData;
      if (!selectedUnit.is_standalone && unitData.property_id) {
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', unitData.property_id)
          .single();
        if (propError) throw propError;
        buildData = buildPDFDataFromUnit(unitData, propData);
      } else {
        buildData = buildPDFDataFromStandalone(unitData);
      }

      // Financing
      const rate = parseFloat(interestRate) || 10.5;
      if (includeFinancing && selectedUnit.price) {
        const price = selectedUnit.price;
        const downPercent = 20;
        const months = 360;
        const downPayment = (price * downPercent) / 100;
        const financedAmount = price - downPayment;
        const monthlyRate = rate / 100 / 12;
        const monthlyPayment =
          (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);

        buildData.financingSimulation = {
          downPaymentPercent: downPercent,
          downPayment,
          financedAmount,
          monthlyPayment,
          months,
          annualRate: rate,
        };
      }

      if (leadName.trim()) buildData.leadName = leadName.trim();
      if (introMessage.trim()) buildData.introductionMessage = introMessage.trim();

      // Custom simulation
      if (includeCustomSim) {
        const cPrice = parseFloat(customBasePrice) || selectedUnit.price || 0;
        const cDown = parseFloat(customDownPercent) || 20;
        const cRate = parseFloat(customRate) || 10.5;
        const cMonths = 360;
        const cDownPayment = (cPrice * cDown) / 100;
        const cFinanced = cPrice - cDownPayment;
        const cMonthlyRate = cRate / 100 / 12;
        const cMonthly = (cFinanced * cMonthlyRate * Math.pow(1 + cMonthlyRate, cMonths)) / (Math.pow(1 + cMonthlyRate, cMonths) - 1);

        buildData.customSimulation = {
          basePrice: cPrice,
          downPaymentPercent: cDown,
          downPayment: cDownPayment,
          financedAmount: cFinanced,
          monthlyPayment: cMonthly,
          months: cMonths,
          annualRate: cRate,
        };
      }

      // Agent info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user?.id || '')
        .single();

      const agent: AgentInfo = {
        name: profile?.full_name || 'Corretor',
        email: profile?.email || undefined,
        phone: profile?.phone || undefined,
        whatsapp: includeAgentWhatsApp ? (profile?.phone || undefined) : undefined,
      };

      setPdfData(buildData);
      setAgentInfo(agent);
      setReadyToCapture(true);
    } catch (error: any) {
      toast({ title: 'Erro ao gerar proposta', description: error.message, variant: 'destructive' });
      setGenerating(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isEditing ? 'Editar Proposta' : 'Nova Proposta Comercial'}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? 'Atualize os dados e regenere o PDF.'
                : 'Gere uma proposta premium personalizada para o seu cliente.'}
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
                  <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
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

              {/* Contact Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Cliente / Contato
                </Label>
                <ContactSelector
                  value={selectedContactId}
                  onChange={(id) => {
                    setSelectedContactId(id);
                    setSelectedDealId(null); // reset deal when contact changes
                  }}
                  placeholder="Selecione um contato..."
                />
                {/* Fallback manual name if no contact selected */}
                {!selectedContactId && (
                  <Input
                    placeholder="Ou digite o nome do cliente"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="mt-1"
                  />
                )}
              </div>

              {/* Deal Selector — only show when contact has deals */}
              {selectedContactId && contactDeals && contactDeals.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Vincular a uma Negociação? (opcional)
                  </Label>
                  <Select value={selectedDealId || 'none'} onValueChange={(v) => setSelectedDealId(v === 'none' ? null : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma negociação selecionada" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {contactDeals.map((deal: any) => {
                        const pipelineLabels: Record<string, string> = { vendas: 'Venda', locacoes: 'Locação', captacoes: 'Captação' };
                        const pipelineLabel = pipelineLabels[deal.pipeline_type] || deal.pipeline_type || 'Venda';
                        const dealTitle = (deal.lead as any)?.name || 'Negociação';
                        return (
                        <SelectItem key={deal.id} value={deal.id}>
                          [{pipelineLabel}] {dealTitle}
                        </SelectItem>
                      );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Introduction Message + AI Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="intro-msg" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Mensagem de Introdução
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    disabled={generatingAI || !selectedUnit}
                    onClick={handleGenerateAI}
                  >
                    {generatingAI ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    Gerar com IA
                  </Button>
                </div>
                <Textarea
                  id="intro-msg"
                  placeholder="Escreva uma mensagem personalizada para o cliente..."
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Será incluída na proposta. Use o botão de IA para gerar automaticamente.
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

                {/* Interest Rate — only visible when financing is on */}
                {includeFinancing && (
                  <div className="pl-3 space-y-1.5">
                    <Label htmlFor="interest-rate" className="flex items-center gap-2 text-xs">
                      <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                      Taxa de Juros Anual (%)
                    </Label>
                    <Input
                      id="interest-rate"
                      type="number"
                      step="0.1"
                      min="1"
                      max="30"
                      placeholder="10.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="h-8 w-32 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Padrão: 10,5% a.a. (média de mercado)</p>
                  </div>
                )}

                {/* Custom Simulation */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Simulação Personalizada</p>
                      <p className="text-xs text-muted-foreground">
                        Valores customizados de entrada, taxa e parcela
                      </p>
                    </div>
                  </div>
                  <Switch checked={includeCustomSim} onCheckedChange={setIncludeCustomSim} />
                </div>

                {includeCustomSim && (
                  <div className="pl-3 space-y-3 p-3 rounded-lg bg-muted/30 border">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor Base do Imóvel (R$)</Label>
                      <Input
                        type="number"
                        placeholder={selectedUnit?.price?.toString() || '0'}
                        value={customBasePrice}
                        onChange={(e) => setCustomBasePrice(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">% de Entrada</Label>
                        <Input
                          type="number"
                          step="1"
                          min="5"
                          max="90"
                          placeholder="20"
                          value={customDownPercent}
                          onChange={(e) => setCustomDownPercent(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Taxa de Juros (% a.a.)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          max="30"
                          placeholder="10.5"
                          value={customRate}
                          onChange={(e) => setCustomRate(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

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

                {/* Agent WhatsApp CTA */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.584-1.47A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.317-.727-6.002-1.96l-.42-.317-2.716.871.893-2.647-.345-.44A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                    <div>
                      <p className="text-sm font-medium">Incluir meu WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        Adiciona seu número como CTA no final da proposta
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Número cadastrado neste usuário (configurações).
                      </p>
                    </div>
                  </div>
                  <Switch checked={includeAgentWhatsApp} onCheckedChange={setIncludeAgentWhatsApp} />
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
                      {includeFinancing && <li>💰 Com simulação de financiamento ({interestRate}% a.a.)</li>}
                      {includeCover && <li>🖼️ Com capa visual</li>}
                      {introMessage && <li>✍️ Com mensagem personalizada</li>}
                      {dealId && <li>🤝 Vinculada a negociação do CRM</li>}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex-shrink-0 space-y-2">
            {/* AI Credits display */}
            {credits && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-amber-500" />
                <span>Saldo: {credits.total_available} tokens IA</span>
              </div>
            )}
            <div className="flex gap-3">
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
                    Criando magia...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    {isEditing ? 'Atualizar Proposta' : 'Gerar Proposta'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hidden PDF Template - rendered off-screen for html2canvas capture */}
      {pdfData && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <ProposalPdfTemplate ref={templateRef} data={pdfData} agent={agentInfo} />
        </div>
      )}
    </>
  );
}