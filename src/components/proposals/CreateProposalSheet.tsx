import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useProposals, type CreateProposalInput, type Proposal } from '@/hooks/useProposals';
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
  Wand2,
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
  /** Pre-fill lead name (e.g. from CRM deal) */
  initialLeadName?: string;
  /** Link to a CRM deal */
  dealId?: string;
  /** Existing proposal data for editing */
  editingProposal?: Proposal | null;
  /** Callback after successful generation with pdf blob */
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
  const { toast } = useToast();

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [introMessage, setIntroMessage] = useState('');
  const [includeFinancing, setIncludeFinancing] = useState(false);
  const [includeCover, setIncludeCover] = useState(true);

  const isEditing = !!editingProposal;

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

  // AI intro generation
  const handleGenerateAI = async () => {
    if (!selectedUnit) {
      toast({ title: 'Selecione um imóvel primeiro', variant: 'destructive' });
      return;
    }
    setGeneratingAI(true);
    try {
      const { data: unitData } = await supabase
        .from('units')
        .select('unit_number, property_type, price, area, bedrooms, suites, parking_spots, neighborhood, city, furnished, condition')
        .eq('id', selectedUnit.id)
        .single();

      const propertyInfo = unitData
        ? `Imóvel: ${unitData.unit_number}, Tipo: ${unitData.property_type || 'N/A'}, Preço: R$${unitData.price || 'N/A'}, Área: ${unitData.area || 'N/A'}m², Quartos: ${unitData.bedrooms || 'N/A'}, Suítes: ${unitData.suites || 'N/A'}, Vagas: ${unitData.parking_spots || 'N/A'}, Bairro: ${unitData.neighborhood || 'N/A'}, Cidade: ${unitData.city || 'N/A'}, Mobília: ${unitData.furnished || 'N/A'}, Condição: ${unitData.condition || 'N/A'}`
        : 'Informações indisponíveis';

      const clientRef = leadName ? ` O nome do cliente é ${leadName}.` : '';

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Escreva uma mensagem de introdução persuasiva e profissional de 3 parágrafos curtos para oferecer este imóvel a um cliente final. Seja elegante, direto e destaque os pontos fortes. Dados do imóvel: ${propertyInfo}.${clientRef} Responda apenas com a mensagem, sem markdown.`,
            },
          ],
        },
      });

      if (error) throw error;

      // Robust extraction: handle multiple response shapes from ai-chat
      let aiText = '';
      if (typeof data === 'string') {
        aiText = data;
      } else if (data) {
        aiText = data.content || data.message || data.response || data.text || data.reply || '';
        // Handle nested response (e.g. { choices: [{ message: { content: "..." } }] })
        if (!aiText && data.choices && Array.isArray(data.choices) && data.choices[0]) {
          aiText = data.choices[0].message?.content || data.choices[0].text || '';
        }
      }
      
      if (aiText && aiText.trim()) {
        const cleaned = aiText.trim();
        setIntroMessage(cleaned);
        // Force a re-render tick to ensure textarea updates
        setTimeout(() => setIntroMessage(cleaned), 0);
        toast({ title: 'Texto gerado com IA!' });
      } else {
        toast({ title: 'IA não retornou texto', description: 'Tente novamente ou escreva manualmente.', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast({ title: 'Erro ao gerar texto com IA', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingAI(false);
    }
  };

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

      // Financing
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

      if (leadName.trim()) pdfData.leadName = leadName.trim();
      if (introMessage.trim()) pdfData.introductionMessage = introMessage.trim();

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
      };

      // Generate PDF as blob for storage upload
      const pdfBlob = await generatePropertyPDF(pdfData, agent, { returnBlob: true });

      let pdfUrl: string | null = null;

      if (pdfBlob) {
        // Upload to storage
        const fileName = `${effectiveBrokerId}/${Date.now()}_proposta.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from('proposals')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('proposals').getPublicUrl(fileName);
          pdfUrl = urlData?.publicUrl || null;
        }
      }

      // Also trigger download
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Proposta_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Save / Update
      const proposalInput = {
        property_id: selectedUnit.property_id,
        unit_id: selectedUnit.id,
        deal_id: dealId || (editingProposal as any)?.deal_id || undefined,
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
            </div>

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
                    {dealId && <li>🤝 Vinculada a negociação do CRM</li>}
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
      </SheetContent>
    </Sheet>
  );
}
