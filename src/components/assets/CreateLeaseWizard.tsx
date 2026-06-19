import { useState, useMemo, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { format, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Calendar,
  Wallet,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Search,
  Building2,
  Sparkles,
  Shield,
  CreditCard,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateLease, useUpdateLease, GuarantorData, PaymentInfo, Lease } from "@/hooks/useLeases";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useCepSearch } from "@/hooks/useCepSearch";
import type { LeaseConversionContext } from "@/hooks/useLeaseConversionContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GuarantorSelector } from "./GuarantorSelector";

// Pre-fill data that can be passed from CRM conversion
export interface LeasePreFillData {
  tenantName?: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  rentAmount?: number;
  dealId?: string;
}

interface CreateLeaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitName: string;
  ownerContactId?: string | null;
  onSuccess?: () => void;
  // Pre-fill data from CRM conversion
  preFillData?: LeasePreFillData;
  conversionContext?: LeaseConversionContext | null;
  // Edit mode: pass existing lease to edit
  editLease?: Lease | null;
}

type WizardStep = "tenant" | "financial" | "guarantee" | "payment" | "cobranca" | "compliance";

type GuaranteeType = "fiador" | "caucao" | "seguro_fianca" | "none";

const STEPS: { id: WizardStep; title: string; icon: React.ReactNode; optional?: boolean }[] = [
  { id: "tenant", title: "Inquilino", icon: <User className="h-4 w-4" /> },
  { id: "financial", title: "Financeiro", icon: <Wallet className="h-4 w-4" /> },
  { id: "guarantee", title: "Garantia", icon: <Shield className="h-4 w-4" /> },
  { id: "payment", title: "Pagamento", icon: <CreditCard className="h-4 w-4" /> },
  { id: "cobranca", title: "Cobrança", icon: <Receipt className="h-4 w-4" /> },
  { id: "compliance", title: "DIMOB", icon: <FileText className="h-4 w-4" /> },
];

const GUARANTEE_OPTIONS = [
  { value: "caucao" as GuaranteeType, label: "Caução em Dinheiro", description: "Depósito de até 3 meses de aluguel" },
  { value: "fiador" as GuaranteeType, label: "Fiador", description: "Pessoa física como garantidora" },
  { value: "seguro_fianca" as GuaranteeType, label: "Seguro Fiança", description: "Apólice junto a seguradora" },
  { value: "none" as GuaranteeType, label: "Sem Garantia", description: "Aluguel antecipado (Art. 42)" },
];

const CIVIL_STATUS_OPTIONS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União Estável",
  "Separado(a)",
];

export function CreateLeaseWizard({
  open,
  onOpenChange,
  unitId,
  unitName,
  ownerContactId,
  onSuccess,
  preFillData,
  conversionContext,
  editLease,
}: CreateLeaseWizardProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const createLease = useCreateLease();
  const updateLease = useUpdateLease();
  const { isLoadingCep, handleCepBlur, formatCep } = useCepSearch();

  const [step, setStep] = useState<WizardStep>("tenant");
  const [searchTerm, setSearchTerm] = useState("");

  // Flag to indicate this is a CRM conversion (for UI hints)
  const isFromCrmConversion = !!conversionContext;
  const isEditMode = !!editLease;

  // Initialize form data with defaults or edit values
  const getInitialFormData = () => ({
    tenant_contact_id: "",
    rent_amount: 0,
    admin_fee_percentage: 10,
    due_day: 10,
    deposit_amount: 0,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    cib: "",
    is_dimob_deductible: true,
    notes: "",
    adjustment_index: "IGPM",
    guarantee_type: "caucao" as GuaranteeType,
  });

  const [formData, setFormData] = useState(getInitialFormData);

  // Guarantor data for "fiador" type
  const [guarantorData, setGuarantorData] = useState<GuarantorData>({
    nome: "",
    cpf: "",
    rg: "",
    profissao: "",
    estadoCivil: "Solteiro(a)",
    cep: "",
    endereco: "",
    cidade: "",
    estado: "",
  });

  // Selected guarantor contact ID (if using existing fiador)
  const [selectedGuarantorContactId, setSelectedGuarantorContactId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    tipo: "pix",
    chavePix: "",
    banco: "",
    agencia: "",
    conta: "",
    titular: "",
  });

  const [chargeConfig, setChargeConfig] = useState({
    is_active: false,
    billing_type: 'BOLETO',
    fine_percentage: 2,
    interest_percentage: 1,
    discount_value: 0,
    discount_days: 0,
    send_email: true,
    send_whatsapp: false,
    description: '',
  });

  const { data: hasAsaasAccount } = useQuery({
    queryKey: ['asaas-account-exists', effectiveBrokerId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('asaas_accounts')
        .select('id')
        .eq('broker_id', effectiveBrokerId || user!.id)
        .eq('status', 'active')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && open,
  });

  // Load edit mode data
  useEffect(() => {
    if (open && editLease) {
      setFormData({
        tenant_contact_id: editLease.tenant_contact_id,
        rent_amount: editLease.rent_amount,
        admin_fee_percentage: editLease.admin_fee_percentage,
        due_day: editLease.due_day,
        deposit_amount: editLease.deposit_amount,
        start_date: editLease.start_date,
        end_date: editLease.end_date || "",
        cib: editLease.cib || "",
        is_dimob_deductible: editLease.is_dimob_deductible,
        notes: editLease.notes || "",
        adjustment_index: editLease.metadata?.adjustment_index as string || "IGPM",
        guarantee_type: (editLease.guarantee_type || "caucao") as GuaranteeType,
      });
      if (editLease.guarantor_data) {
        setGuarantorData(editLease.guarantor_data);
      }
      if (editLease.payment_info) {
        setPaymentInfo(editLease.payment_info);
      }
    } else if (open && preFillData?.rentAmount) {
      setFormData(prev => ({ ...prev, rent_amount: preFillData.rentAmount || 0 }));
    }
  }, [open, editLease, preFillData?.rentAmount]);

  // Pre-fill search term with tenant name from CRM
  useEffect(() => {
    if (open && preFillData?.tenantName && !isEditMode) {
      setSearchTerm(preFillData.tenantName);
    }
  }, [open, preFillData?.tenantName, isEditMode]);

  // Check if spouse data is needed (Vênia Conjugal)
  const needsSpouseData = guarantorData.estadoCivil === "Casado(a)" || guarantorData.estadoCivil === "União Estável";

  // Handle CEP blur for guarantor address
  const handleGuarantorCepBlur = () => {
    handleCepBlur(guarantorData.cep || "", (result) => {
      setGuarantorData(prev => ({
        ...prev,
        endereco: result.address || prev.endereco,
        cidade: result.city || prev.cidade,
        estado: result.state || prev.estado,
      }));
    });
  };

  // Auto-calculate next adjustment date (start_date + 12 months)
  const nextAdjustmentDate = useMemo(() => {
    if (!formData.start_date) return null;
    try {
      const startDate = new Date(formData.start_date);
      return format(addYears(startDate, 1), "yyyy-MM-dd");
    } catch {
      return null;
    }
  }, [formData.start_date]);

  // Fetch tenants (contacts with "Inquilino" category)
  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ["contacts-tenants", user?.id, searchTerm],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("contacts")
        .select("id, name, email, phone, whatsapp")
        .eq("broker_id", effectiveBrokerId || user.id)
        .contains("categories", ["Inquilino"])
        .order("name");

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  const selectedTenant = tenants?.find((t) => t.id === formData.tenant_contact_id);

  const handleNext = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!formData.tenant_contact_id) {
      toast({
        title: "Selecione um inquilino",
        variant: "destructive",
      });
      setStep("tenant");
      return;
    }

    if (!formData.rent_amount || formData.rent_amount <= 0) {
      toast({
        title: "Informe o valor do aluguel",
        variant: "destructive",
      });
      setStep("financial");
      return;
    }

    try {
      // Build guarantor data only if fiador is selected
      const finalGuarantorData = formData.guarantee_type === "fiador" && guarantorData.nome
        ? guarantorData
        : null;

      // Build payment info if provided
      const finalPaymentInfo = paymentInfo.chavePix || paymentInfo.banco
        ? paymentInfo
        : null;

      // Create guarantor contact if fiador was manually filled (not selected from existing)
      if (formData.guarantee_type === "fiador" && guarantorData.nome && !selectedGuarantorContactId && user) {
        try {
          // Check if a contact with this CPF already exists
          const { data: existingContact } = await supabase
            .from("contacts")
            .select("id, categories")
            .eq("broker_id", effectiveBrokerId || user.id)
            .eq("document_number", guarantorData.cpf)
            .maybeSingle();

          if (existingContact) {
            // Update existing contact to add "Fiador" category if not present
            if (!existingContact.categories.includes("Fiador")) {
              await supabase
                .from("contacts")
                .update({
                  categories: [...existingContact.categories, "Fiador"],
                  metadata: {
                    rg: guarantorData.rg,
                    profissao: guarantorData.profissao,
                    estadoCivil: guarantorData.estadoCivil,
                    conjuge: guarantorData.conjuge,
                    imovelGarantia: guarantorData.imovelGarantia,
                  },
                })
                .eq("id", existingContact.id);
            }
          } else {
            // Create new contact with "Fiador" category
            await supabase.from("contacts").insert({
              broker_id: effectiveBrokerId || user.id,
              name: guarantorData.nome,
              document_type: "CPF",
              document_number: guarantorData.cpf,
              address: guarantorData.endereco,
              city: guarantorData.cidade,
              state: guarantorData.estado,
              postal_code: guarantorData.cep,
              categories: ["Fiador"],
              metadata: {
                rg: guarantorData.rg,
                profissao: guarantorData.profissao,
                estadoCivil: guarantorData.estadoCivil,
                conjuge: guarantorData.conjuge,
                imovelGarantia: guarantorData.imovelGarantia,
              },
            });
          }
        } catch (contactError) {
          console.error("Error creating guarantor contact:", contactError);
          // Continue with lease creation even if contact creation fails
        }
      }

      const leaseData = {
        unit_id: unitId,
        tenant_contact_id: formData.tenant_contact_id,
        owner_contact_id: ownerContactId || undefined,
        rent_amount: formData.rent_amount,
        admin_fee_percentage: formData.admin_fee_percentage,
        due_day: formData.due_day,
        deposit_amount: formData.deposit_amount,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        cib: formData.cib || undefined,
        is_dimob_deductible: formData.is_dimob_deductible,
        notes: formData.notes || undefined,
        adjustment_index: formData.adjustment_index,
        next_adjustment_date: nextAdjustmentDate || undefined,
        guarantee_type: formData.guarantee_type,
        guarantor_data: finalGuarantorData,
        payment_info: finalPaymentInfo,
      };

      let leaseId: string | null = null;
      if (isEditMode && editLease) {
        // Update existing lease
        await updateLease.mutateAsync({
          id: editLease.id,
          data: leaseData,
        });
        leaseId = editLease.id;
        toast({ title: "Contrato atualizado com sucesso!" });
      } else {
        // Create new lease
        const result = await createLease.mutateAsync(leaseData);
        leaseId = (result.lease as any)?.id || null;
        const projectionsCount = result.projectionsGenerated;
        const successMessage = projectionsCount > 0
          ? `Contrato criado com sucesso! ${projectionsCount} parcelas financeiras projetadas.`
          : "Contrato criado com sucesso!";
        toast({ 
          title: successMessage,
          description: projectionsCount > 0 
            ? "As parcelas de aluguel foram automaticamente lançadas no financeiro."
            : undefined,
        });
      }

      // Save Asaas charge config if active
      if (leaseId && chargeConfig.is_active) {
        const chargePayload = {
          lease_id: leaseId,
          broker_id: effectiveBrokerId || user!.id,
          is_active: true,
          billing_type: chargeConfig.billing_type,
          fine_percentage: chargeConfig.fine_percentage,
          interest_percentage: chargeConfig.interest_percentage,
          discount_value: chargeConfig.discount_value,
          discount_days: chargeConfig.discount_days,
          send_email: chargeConfig.send_email,
          send_whatsapp: chargeConfig.send_whatsapp,
          description: chargeConfig.description || null,
        };
        if (isEditMode) {
          await supabase
            .from('contract_charges')
            .upsert(chargePayload, { onConflict: 'lease_id' });
        } else {
          await supabase.from('contract_charges').insert(chargePayload);
        }
      }

      // Se cobrança ativa, disparar criação no Asaas
      if (chargeConfig.is_active && leaseId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-asaas-charge`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ lease_id: leaseId }),
            }
          );
          // erros da edge function são logados mas não bloqueiam o fluxo do wizard
        } catch (efErr) {
          console.warn('create-asaas-charge falhou (não bloqueia):', efErr);
        }
      }

      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData(getInitialFormData());
      setGuarantorData({
        nome: "", cpf: "", rg: "", profissao: "", estadoCivil: "Solteiro(a)",
        cep: "", endereco: "", cidade: "", estado: "",
      });
      setSelectedGuarantorContactId(null);
      setPaymentInfo({ tipo: "pix", chavePix: "", banco: "", agencia: "", conta: "", titular: "" });
      setChargeConfig({
        is_active: false, billing_type: 'BOLETO', fine_percentage: 2,
        interest_percentage: 1, discount_value: 0, discount_days: 0,
        send_email: true, send_whatsapp: false, description: '',
      });
      setStep("tenant");
      setSearchTerm("");
    } catch (error) {
      toast({
        title: isEditMode ? "Erro ao atualizar contrato" : "Erro ao criar contrato",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case "tenant":
        return !!formData.tenant_contact_id;
      case "financial":
        return formData.rent_amount > 0 && formData.due_day >= 1 && formData.due_day <= 31;
      case "guarantee":
        if (formData.guarantee_type === "fiador") {
          const hasBasicInfo = guarantorData.nome && guarantorData.cpf;
          if (needsSpouseData) {
            return hasBasicInfo && guarantorData.conjuge?.nome && guarantorData.conjuge?.cpf;
          }
          return hasBasicInfo;
        }
        return true;
      case "payment":
        return true; // Payment info is optional
      case "cobranca":
        return true; // sempre opcional
      case "compliance":
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <style>{`
          .lease-wizard-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .lease-wizard-scroll::-webkit-scrollbar-track {
            background: hsl(var(--muted) / 0.3);
            border-radius: 9999px;
          }
          .lease-wizard-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--muted-foreground) / 0.4);
            border-radius: 9999px;
          }
          .lease-wizard-scroll::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--muted-foreground) / 0.6);
          }
        `}</style>
        <DialogHeader className="flex-shrink-0 space-y-1.5">
          <DialogTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <span className="truncate">{isEditMode ? "Editar Contrato" : "Novo Contrato"}</span>
            {isFromCrmConversion && (
              <span className="ml-auto flex items-center gap-1 text-[10px] sm:text-xs font-normal text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Via CRM
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="truncate text-xs sm:text-sm">
            {unitName}
            {conversionContext && (
              <span className="block text-[11px] sm:text-xs mt-0.5 text-muted-foreground">
                Cliente: {conversionContext.leadName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator - Mobile: scrollable, Desktop: full width */}
        <div className="w-full shrink-0 overflow-x-auto -mx-1 px-1">
          <div className="flex items-center justify-start gap-0.5 sm:gap-1 py-2 sm:py-3 min-w-max">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => {
                  const currentIndex = STEPS.findIndex((st) => st.id === step);
                  const targetIndex = STEPS.findIndex((st) => st.id === s.id);
                  if (targetIndex <= currentIndex || canProceed()) {
                    setStep(s.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm transition-colors whitespace-nowrap",
                  step === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span className="[&>svg]:h-3 [&>svg]:w-3 sm:[&>svg]:h-4 sm:[&>svg]:w-4">{s.icon}</span>
                <span className="hidden xs:inline sm:inline">{s.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground mx-0.5 flex-shrink-0" />
              )}
            </div>
          ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 lease-wizard-scroll">
          <div className="pb-4 pr-3">
          {/* Tenant Step */}
          {step === "tenant" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Inquilino</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selecionar Inquilino *</Label>
                {loadingTenants ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tenants && tenants.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        onClick={() => setFormData({ ...formData, tenant_contact_id: tenant.id })}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          formData.tenant_contact_id === tenant.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tenant.email || tenant.phone || "Sem contato"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border rounded-lg">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum inquilino encontrado.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre um contato com a categoria "Inquilino" primeiro.
                    </p>
                  </div>
                )}
              </div>

              {selectedTenant && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Selecionado: {selectedTenant.name}</p>
                  {selectedTenant.whatsapp && (
                    <p className="text-xs text-muted-foreground">WhatsApp: {selectedTenant.whatsapp}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Financial Step */}
          {step === "financial" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor do Aluguel *</Label>
                  <CurrencyInput
                    value={formData.rent_amount.toString()}
                    onChange={(value) => setFormData({ ...formData, rent_amount: parseFloat(value) || 0 })}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento *</Label>
                  <Select
                    value={formData.due_day.toString()}
                    onValueChange={(v) => setFormData({ ...formData, due_day: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Taxa de Administração (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.admin_fee_percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, admin_fee_percentage: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Caução</Label>
                  <CurrencyInput
                    value={formData.deposit_amount.toString()}
                    onChange={(value) => setFormData({ ...formData, deposit_amount: parseFloat(value) || 0 })}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início do Contrato *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim do Contrato</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Adjustment Index */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Índice de Reajuste *</Label>
                  <Select
                    value={formData.adjustment_index}
                    onValueChange={(v) => setFormData({ ...formData, adjustment_index: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IGPM">IGP-M</SelectItem>
                      <SelectItem value="IPCA">IPCA</SelectItem>
                      <SelectItem value="INPC">INPC</SelectItem>
                      <SelectItem value="Fixo">Fixo (sem reajuste)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Próximo Reajuste</Label>
                  <Input
                    type="date"
                    value={nextAdjustmentDate || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Calculado automaticamente (início + 12 meses)
                  </p>
                </div>
              </div>

              {/* Calculated preview */}
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repasse Líquido (estimado)</span>
                <span className="font-semibold text-primary">
                  {(formData.rent_amount * (1 - formData.admin_fee_percentage / 100)).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
              </div>
            </div>
          )}

          {/* Guarantee Step */}
          {step === "guarantee" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Garantia *</Label>
                <RadioGroup
                  value={formData.guarantee_type}
                  onValueChange={(v) => setFormData({ ...formData, guarantee_type: v as GuaranteeType })}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {GUARANTEE_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={cn(
                        "flex items-start gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors",
                        formData.guarantee_type === opt.value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setFormData({ ...formData, guarantee_type: opt.value })}
                    >
                      <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor={opt.value} className="font-medium cursor-pointer text-sm">{opt.label}</Label>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Fiador Fields */}
              {formData.guarantee_type === "fiador" && (
                <div className="space-y-4 pt-3 border-t">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Dados do Fiador</p>
                  
                  {/* Guarantor Selector */}
                  <GuarantorSelector
                    guarantorData={guarantorData}
                    onGuarantorChange={setGuarantorData}
                    selectedContactId={selectedGuarantorContactId}
                    onContactSelect={setSelectedGuarantorContactId}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs sm:text-sm">Nome Completo *</Label>
                      <Input
                        value={guarantorData.nome}
                        onChange={(e) => setGuarantorData({ ...guarantorData, nome: e.target.value })}
                        placeholder="Nome do fiador"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">CPF *</Label>
                      <Input
                        value={guarantorData.cpf}
                        onChange={(e) => setGuarantorData({ ...guarantorData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">RG</Label>
                      <Input
                        value={guarantorData.rg || ""}
                        onChange={(e) => setGuarantorData({ ...guarantorData, rg: e.target.value })}
                        placeholder="RG"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Profissão</Label>
                      <Input
                        value={guarantorData.profissao || ""}
                        onChange={(e) => setGuarantorData({ ...guarantorData, profissao: e.target.value })}
                        placeholder="Profissão"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Estado Civil *</Label>
                      <Select
                        value={guarantorData.estadoCivil}
                        onValueChange={(v) => setGuarantorData({ ...guarantorData, estadoCivil: v })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CIVIL_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fiador Address with CEP */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Endereço do Fiador</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">CEP</Label>
                        <div className="relative">
                          <Input
                            value={guarantorData.cep || ""}
                            onChange={(e) => setGuarantorData({ ...guarantorData, cep: formatCep(e.target.value) })}
                            onBlur={handleGuarantorCepBlur}
                            placeholder="00000-000"
                            disabled={isLoadingCep}
                            className="text-sm"
                          />
                          {isLoadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1.5">
                        <Label className="text-xs sm:text-sm">Endereço</Label>
                        <Input
                          value={guarantorData.endereco}
                          onChange={(e) => setGuarantorData({ ...guarantorData, endereco: e.target.value })}
                          placeholder="Rua, número"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Cidade</Label>
                        <Input
                          value={guarantorData.cidade}
                          onChange={(e) => setGuarantorData({ ...guarantorData, cidade: e.target.value })}
                          placeholder="Cidade"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">UF</Label>
                        <Input
                          value={guarantorData.estado}
                          onChange={(e) => setGuarantorData({ ...guarantorData, estado: e.target.value.toUpperCase() })}
                          placeholder="UF"
                          maxLength={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vênia Conjugal - Spouse Data */}
                  {needsSpouseData && (
                    <div className="space-y-3 pt-3 border-t border-dashed">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <p className="text-sm font-medium text-amber-700">Vênia Conjugal Obrigatória</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Para fiador casado(a) ou em união estável, é necessário os dados do cônjuge (Art. 1.647, III CC).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <Label>Nome do Cônjuge *</Label>
                          <Input
                            value={guarantorData.conjuge?.nome || ""}
                            onChange={(e) => setGuarantorData({
                              ...guarantorData,
                              conjuge: { ...guarantorData.conjuge, nome: e.target.value, cpf: guarantorData.conjuge?.cpf || "" }
                            })}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CPF do Cônjuge *</Label>
                          <Input
                            value={guarantorData.conjuge?.cpf || ""}
                            onChange={(e) => setGuarantorData({
                              ...guarantorData,
                              conjuge: { ...guarantorData.conjuge, cpf: e.target.value, nome: guarantorData.conjuge?.nome || "" }
                            })}
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>RG do Cônjuge</Label>
                          <Input
                            value={guarantorData.conjuge?.rg || ""}
                            onChange={(e) => setGuarantorData({
                              ...guarantorData,
                              conjuge: { ...guarantorData.conjuge, rg: e.target.value, nome: guarantorData.conjuge?.nome || "", cpf: guarantorData.conjuge?.cpf || "" }
                            })}
                            placeholder="RG"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Imóvel de Garantia */}
                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">Imóvel em Garantia (opcional)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Endereço do Imóvel</Label>
                        <Input
                          value={guarantorData.imovelGarantia?.endereco || ""}
                          onChange={(e) => setGuarantorData({
                            ...guarantorData,
                            imovelGarantia: { ...guarantorData.imovelGarantia, endereco: e.target.value, matricula: guarantorData.imovelGarantia?.matricula || "" }
                          })}
                          placeholder="Endereço completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Matrícula</Label>
                        <Input
                          value={guarantorData.imovelGarantia?.matricula || ""}
                          onChange={(e) => setGuarantorData({
                            ...guarantorData,
                            imovelGarantia: { ...guarantorData.imovelGarantia, matricula: e.target.value, endereco: guarantorData.imovelGarantia?.endereco || "" }
                          })}
                          placeholder="Nº da matrícula"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cartório</Label>
                        <Input
                          value={guarantorData.imovelGarantia?.cartorio || ""}
                          onChange={(e) => setGuarantorData({
                            ...guarantorData,
                            imovelGarantia: { ...guarantorData.imovelGarantia, cartorio: e.target.value, endereco: guarantorData.imovelGarantia?.endereco || "", matricula: guarantorData.imovelGarantia?.matricula || "" }
                          })}
                          placeholder="Nome do cartório"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Step */}
          {step === "payment" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Dados para Pagamento</Label>
                <p className="text-sm text-muted-foreground">
                  Informe como o inquilino deve realizar o pagamento do aluguel. Estes dados aparecerão no contrato.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Tipo de Pagamento</Label>
                <Select
                  value={paymentInfo.tipo}
                  onValueChange={(v) => setPaymentInfo({ ...paymentInfo, tipo: v as "pix" | "banco" | "boleto" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="banco">Transferência Bancária</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentInfo.tipo === "pix" && (
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input
                    value={paymentInfo.chavePix || ""}
                    onChange={(e) => setPaymentInfo({ ...paymentInfo, chavePix: e.target.value })}
                    placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  />
                </div>
              )}

              {paymentInfo.tipo === "banco" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Banco</Label>
                      <Input
                        value={paymentInfo.banco || ""}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, banco: e.target.value })}
                        placeholder="Nome do banco"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agência</Label>
                      <Input
                        value={paymentInfo.agencia || ""}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, agencia: e.target.value })}
                        placeholder="0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conta</Label>
                      <Input
                        value={paymentInfo.conta || ""}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, conta: e.target.value })}
                        placeholder="00000-0"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Titular</Label>
                      <Input
                        value={paymentInfo.titular || ""}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, titular: e.target.value })}
                        placeholder="Nome do titular da conta"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  💡 Estas informações serão incluídas na Cláusula 4.2 do contrato de locação.
                </p>
              </div>
            </div>
          )}

          {/* Cobrança Step (Asaas) */}
          {step === "cobranca" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Recebedor</p>
                  <p className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email || "Corretor"}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pagador</p>
                  <p className="text-sm font-medium">{selectedTenant?.name || "-"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 p-4 border rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Cobrança automática de boletos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gera boletos/PIX automaticamente via Asaas a cada vencimento
                  </p>
                </div>
                <Switch
                  checked={chargeConfig.is_active}
                  onCheckedChange={checked => setChargeConfig(p => ({ ...p, is_active: checked }))}
                  disabled={!hasAsaasAccount}
                />
              </div>

              {!hasAsaasAccount && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">Conta Asaas não configurada</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Configure sua conta Asaas em Configurações para ativar a cobrança automática.
                    </p>
                  </div>
                </div>
              )}

              {chargeConfig.is_active && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Tipo de Cobrança</Label>
                    <Select value={chargeConfig.billing_type} onValueChange={v => setChargeConfig(p => ({ ...p, billing_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                        <SelectItem value="PIX">PIX (QR Code)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Multa por atraso (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={chargeConfig.fine_percentage}
                        onChange={e => setChargeConfig(p => ({ ...p, fine_percentage: parseFloat(e.target.value) || 0 }))}
                        placeholder="2%"
                      />
                      <p className="text-[10px] text-muted-foreground">Máx. 2% (Lei 8.245/91)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Juros mensais (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={12}
                        step={0.1}
                        value={chargeConfig.interest_percentage}
                        onChange={e => setChargeConfig(p => ({ ...p, interest_percentage: parseFloat(e.target.value) || 0 }))}
                        placeholder="1%"
                      />
                      <p className="text-[10px] text-muted-foreground">Máx. 1%/mês</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Desconto antecipado (R$)</Label>
                      <CurrencyInput
                        value={chargeConfig.discount_value.toString()}
                        onChange={v => setChargeConfig(p => ({ ...p, discount_value: parseFloat(v) || 0 }))}
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dias de antecedência</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={chargeConfig.discount_days}
                        onChange={e => setChargeConfig(p => ({ ...p, discount_days: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição no boleto (opcional)</Label>
                    <Input
                      value={chargeConfig.description}
                      onChange={e => setChargeConfig(p => ({ ...p, description: e.target.value }))}
                      placeholder="Ex: Aluguel ref. outubro/2025"
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-3 pt-1">
                    <Label className="text-sm font-medium">Notificar inquilino por:</Label>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm">E-mail</p>
                        <p className="text-xs text-muted-foreground">Enviar boleto e lembretes por e-mail</p>
                      </div>
                      <Switch
                        checked={chargeConfig.send_email}
                        onCheckedChange={checked => setChargeConfig(p => ({ ...p, send_email: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">Enviar link do boleto via WhatsApp</p>
                      </div>
                      <Switch
                        checked={chargeConfig.send_whatsapp}
                        onCheckedChange={checked => setChargeConfig(p => ({ ...p, send_whatsapp: checked }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!chargeConfig.is_active && hasAsaasAccount && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    A cobrança automática pode ser configurada a qualquer momento nas configurações do contrato.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Compliance Step */}
          {step === "compliance" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>CIB (Cadastro Imobiliário Brasileiro)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>O CIB substitui o número de inscrição do IPTU para identificar imóveis perante a Receita Federal. Obrigatório para DIMOB.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  value={formData.cib}
                  onChange={(e) => setFormData({ ...formData, cib: e.target.value })}
                  placeholder="Ex: 0000.0000.0000.0000-00"
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="dimob" className="text-sm font-medium cursor-pointer">
                    Dedutível para DIMOB
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marque se os valores devem ser declarados na DIMOB
                  </p>
                </div>
                <Switch
                  id="dimob" 
                  checked={formData.is_dimob_deductible}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_dimob_deductible: !!checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotações sobre o contrato..."
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="p-3 border rounded-lg bg-muted/30 space-y-2 text-sm">
                <p className="font-medium">Resumo do Contrato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-xs sm:text-sm">
                  <span>Inquilino:</span>
                  <span className="font-medium text-foreground">{selectedTenant?.name || "-"}</span>
                  <span>Aluguel:</span>
                  <span className="font-medium text-foreground">
                    {formData.rent_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <span>Vencimento:</span>
                  <span className="font-medium text-foreground">Dia {formData.due_day}</span>
                  <span>Garantia:</span>
                  <span className="font-medium text-foreground">
                    {GUARANTEE_OPTIONS.find(o => o.value === formData.guarantee_type)?.label}
                  </span>
                  {formData.guarantee_type === "fiador" && guarantorData.nome && (
                    <>
                      <span>Fiador:</span>
                      <span className="font-medium text-foreground">{guarantorData.nome}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 flex-shrink-0 pt-3 sm:pt-4 border-t">
          {step !== "tenant" && (
            <Button variant="outline" onClick={handleBack} size="sm" className="flex-1 sm:flex-none h-9 sm:h-10">
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          )}
          {step !== "compliance" ? (
            <Button onClick={handleNext} disabled={!canProceed()} size="sm" className="flex-1 sm:flex-none h-9 sm:h-10">
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createLease.isPending || updateLease.isPending} size="sm" className="flex-1 sm:flex-none h-9 sm:h-10">
              {(createLease.isPending || updateLease.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? "Salvar" : "Criar Contrato"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
