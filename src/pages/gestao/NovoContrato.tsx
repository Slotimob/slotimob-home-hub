import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addYears } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Wallet,
  FileText,
  ChevronRight,
  Loader2,
  AlertCircle,
  Search,
  Building2,
  Shield,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  BellRing,
} from "lucide-react";


import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencyInput } from "@/components/ui/currency-input";
import { GuarantorSelector } from "@/components/assets/GuarantorSelector";
import {
  LeaseFinancialStep,
  getInitialFireInsurance,
  getInitialIptuCharge,
  getInitialAdditionalObligations,
  normalizeAdditionalObligations,
  type LeaseFinancialValue,
} from "@/components/assets/LeaseFinancialStep";
import {
  inheritObligationsConfigFromLease,
  markLeaseObligationsInherited,
} from "@/lib/lease-obligations-inheritance";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCreateLease, useUpdateLease, type GuarantorData, type PaymentInfo } from "@/hooks/useLeases";
import { useToast } from "@/hooks/use-toast";
import { useCepSearch } from "@/hooks/useCepSearch";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes-guard";
import { useUnitSubdivisions } from "@/hooks/useUnitSubdivisions";
import { supabase } from "@/integrations/supabase/client";
import {
  ConfirmLeaseProjectionDialog,
  type LeaseForProjection,
} from "@/components/assets/ConfirmLeaseProjectionDialog";

type WizardStep = "unit" | "tenant" | "financial" | "guarantee" | "payment" | "billing" | "compliance";
type GuaranteeType = "fiador" | "caucao" | "seguro_fianca" | "none";

const STEPS: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
  { id: "unit", title: "Imóvel", icon: <Building2 className="h-4 w-4" /> },
  { id: "tenant", title: "Inquilino", icon: <User className="h-4 w-4" /> },
  { id: "financial", title: "Financeiro", icon: <Wallet className="h-4 w-4" /> },
  { id: "guarantee", title: "Garantia", icon: <Shield className="h-4 w-4" /> },
  { id: "payment", title: "Pagamento", icon: <CreditCard className="h-4 w-4" /> },
  { id: "billing", title: "Cobrança", icon: <BellRing className="h-4 w-4" /> },
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

const DRAFT_KEY = "novo-contrato-draft";

const getInitialFormData = () => ({
  tenant_contact_id: "",
  unit_subdivision_id: null as string | null,
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
  is_indefinite_term: false,
  adjustment_periodicity_months: 12,
  next_adjustment_date: "",
  fire_insurance: getInitialFireInsurance(),
  iptu_charge: getInitialIptuCharge(),
  additional_obligations: getInitialAdditionalObligations(),
});

const getInitialGuarantor = (): GuarantorData => ({
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

const getInitialPayment = (): PaymentInfo => ({
  tipo: "pix",
  chavePix: "",
  banco: "",
  agencia: "",
  conta: "",
  titular: "",
});

export default function NovoContrato() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editLeaseId = searchParams.get("edit") ?? searchParams.get("editLeaseId");
  const unitIdParam = searchParams.get("unitId");
  const tenantIdParam = searchParams.get("tenantId");

  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const createLease = useCreateLease();
  const updateLease = useUpdateLease();
  const { isLoadingCep, handleCepBlur, formatCep } = useCepSearch();

  const stepParam = searchParams.get("step") as WizardStep | null;
  const [step, setStep] = useState<WizardStep>(() => {
    if (stepParam && STEPS.some((s) => s.id === stepParam)) return stepParam;
    if (unitIdParam || editLeaseId) return "tenant";
    return "unit";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const queryClient = useQueryClient();
  const [selectedUnitInfo, setSelectedUnitInfo] = useState<any>(null);
  const [formData, setFormData] = useState(getInitialFormData);
  const [guarantorData, setGuarantorData] = useState<GuarantorData>(getInitialGuarantor);
  const [selectedGuarantorContactId, setSelectedGuarantorContactId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(getInitialPayment);
  const [billingContact, setBillingContact] = useState({
    name: "",
    email: "",
    whatsapp: "", // display format: "(11) 99999-9999"
  });
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [projectionLease, setProjectionLease] = useState<LeaseForProjection | null>(null);
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [postProjectionNavId, setPostProjectionNavId] = useState<string>("");

  // Formata dígitos para exibição: "(11) 99999-9999"
  const formatWhatsAppDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").replace(/^55/, "");
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Converte exibição para armazenamento: "+5511999999999"
  const billingWhatsAppStored = (): string => {
    const digits = billingContact.whatsapp.replace(/\D/g, "");
    return digits ? `+55${digits}` : "";
  };


  const isEditMode = !!editLeaseId;

  // Fetch existing lease for edit mode
  const { data: editLease, isLoading: loadingEdit } = useQuery({
    queryKey: ["lease-detail", editLeaseId, effectiveBrokerId],
    queryFn: async () => {
      if (!editLeaseId) return null;
      const { data, error } = await supabase
        .from("leases")
        .select("*, unit:units!leases_unit_id_fkey(id, unit_number, address)")
        .eq("id", editLeaseId)
        .eq("broker_id", effectiveBrokerId || user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!editLeaseId,
  });

  const isPendingSetup = isEditMode && editLease?.status === "pending";


  // Resolve which unit we'll create the lease for
  const effectiveUnitId = editLease?.unit_id || unitIdParam || selectedUnitId || "";

  // Fetch unit info for header (when not in edit mode and no selectedUnitInfo)
  const { data: unitInfo } = useQuery({
    queryKey: ["unit-name", effectiveUnitId, effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveUnitId) return null;
      const { data } = await supabase
        .from("units")
        .select("id, unit_number, address, owner_contact_id, tenant_contact_id, rent_price")
        .eq("id", effectiveUnitId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user && !!effectiveUnitId && !isEditMode && !selectedUnitInfo,
  });

  // CIB — fonte única de verdade é `units.cib`. Buscamos sempre (inclusive em edição)
  // para pré-preencher o campo do wizard e manter os dois campos sincronizados ao salvar.
  const { data: unitCib } = useQuery({
    queryKey: ["unit-cib", effectiveUnitId, effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveUnitId) return null;
      const { data } = await supabase
        .from("units")
        .select("id, cib")
        .eq("id", effectiveUnitId)
        .maybeSingle();
      return ((data as any)?.cib as string | null) ?? null;
    },
    enabled: !!user && !!effectiveUnitId,
  });

  // Frações (subdivisões) da unidade — só relevante quando a unit tem has_subdivisions
  const { data: unitSubdivisionFlag } = useQuery({
    queryKey: ["unit-has-subdivisions", effectiveUnitId],
    queryFn: async () => {
      const { data } = await supabase
        .from("units")
        .select("has_subdivisions")
        .eq("id", effectiveUnitId)
        .maybeSingle();
      return !!(data as any)?.has_subdivisions;
    },
    enabled: !!user && !!effectiveUnitId,
  });

  const { data: subdivisions = [] } = useUnitSubdivisions(
    unitSubdivisionFlag ? effectiveUnitId : ""
  );
  const showSubdivisionSelect = !!unitSubdivisionFlag && subdivisions.length > 0;



  // Conta Asaas do broker (para validar emissão automática)
  const { data: asaasAccount } = useQuery({
    queryKey: ["asaas-account-status", effectiveBrokerId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("asaas_accounts")
        .select("status")
        .eq("broker_id", effectiveBrokerId || user!.id)
        .limit(1)
        .maybeSingle();
      return data as { status: string | null } | null;
    },
    enabled: !!user,
  });

  const hasActiveAsaasAccount = ["active", "approved", "ACTIVE", "APPROVED"].includes(
    (asaasAccount?.status || "").toString()
  );


  const ownerContactId =
    editLease?.owner_contact_id || selectedUnitInfo?.owner_contact_id || unitInfo?.owner_contact_id || null;
  const unitName =
    editLease?.unit?.unit_number || selectedUnitInfo?.unit_number || unitInfo?.unit_number || "";

  // Proprietário real vinculado ao imóvel/unidade — usado na Matriz de Responsabilidades
  const { data: ownerContactInfo } = useQuery({
    queryKey: ["lease-owner-contact", ownerContactId],
    queryFn: async () => {
      if (!ownerContactId) return null;
      const { data } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("id", ownerContactId)
        .maybeSingle();
      return data as { id: string; name: string } | null;
    },
    enabled: !!user && !!ownerContactId,
  });

  // Load draft from sessionStorage (only for new contracts)
  useEffect(() => {
    if (isEditMode || draftLoaded) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.unitId === unitIdParam) {
          if (draft.formData) setFormData((prev) => ({ ...prev, ...draft.formData }));
          if (draft.guarantorData) setGuarantorData(draft.guarantorData);
          if (draft.paymentInfo) setPaymentInfo(draft.paymentInfo);
          if (draft.billingContact) setBillingContact(draft.billingContact);
          if (draft.selectedUnitId) setSelectedUnitId(draft.selectedUnitId);
          if (draft.selectedUnitInfo) setSelectedUnitInfo(draft.selectedUnitInfo);
          if (draft.step && STEPS.some((s) => s.id === draft.step)) setStep(draft.step as WizardStep);
        }
      }
    } catch {
      /* ignore */
    }
    setDraftLoaded(true);
  }, [isEditMode, draftLoaded, unitIdParam]);

  // Persist draft on changes (only for new contracts)
  useEffect(() => {
    if (isEditMode || !draftLoaded) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          unitId: unitIdParam,
          step,
          selectedUnitId,
          selectedUnitInfo,
          formData,
          guarantorData,
          paymentInfo,
          billingContact,
        })
      );
    } catch {
      /* ignore */
    }
  }, [
    isEditMode,
    draftLoaded,
    unitIdParam,
    step,
    selectedUnitId,
    selectedUnitInfo,
    formData,
    guarantorData,
    paymentInfo,
    billingContact,
  ]);

  // Block PWA auto-reload while the wizard holds unsaved data
  useUnsavedChangesGuard(!isEditMode && draftLoaded && (!!selectedUnitId || !!formData.tenant_contact_id));


  // Hydrate from editLease when fetched
  useEffect(() => {
    if (!editLease) return;
    setFormData({
      tenant_contact_id: editLease.tenant_contact_id,
      unit_subdivision_id: (editLease as any).unit_subdivision_id || null,
      rent_amount: Number(editLease.rent_amount),
      admin_fee_percentage: Number(editLease.admin_fee_percentage),
      due_day: editLease.due_day,
      deposit_amount: Number(editLease.deposit_amount),
      start_date: editLease.start_date,
      end_date: editLease.end_date || "",
      cib: editLease.cib || "",
      is_dimob_deductible: editLease.is_dimob_deductible,
      notes: editLease.notes || "",
      adjustment_index: (editLease.metadata?.adjustment_index as string) || editLease.adjustment_index || "IGPM",
      guarantee_type: (editLease.guarantee_type || "caucao") as GuaranteeType,
      is_indefinite_term: !!editLease.is_indefinite_term,
      adjustment_periodicity_months: Number(editLease.adjustment_periodicity_months) || 12,
      next_adjustment_date: editLease.next_adjustment_date || "",
      fire_insurance: { ...getInitialFireInsurance(), ...(editLease.fire_insurance || {}) },
      iptu_charge: { ...getInitialIptuCharge(), ...(editLease.iptu_charge || {}) },
      additional_obligations: normalizeAdditionalObligations(
        (editLease as any).additional_obligations
      ),
    });
    if (editLease.guarantor_data) setGuarantorData(editLease.guarantor_data);
    if (editLease.payment_info) setPaymentInfo(editLease.payment_info);
    if (editLease.billing_automation?.billing_contact) {
      const bc = editLease.billing_automation.billing_contact;
      setBillingContact({
        name: bc.name || "",
        email: bc.email || "",
        whatsapp: formatWhatsAppDisplay(bc.whatsapp || ""),
      });
    }
  }, [editLease]);

  // Pre-fill tenant/rent from URL param or unit info when creating a new lease
  useEffect(() => {
    if (isEditMode || (!unitInfo && !tenantIdParam)) return;
    setFormData((prev) => {
      const next = { ...prev };
      if (tenantIdParam && !next.tenant_contact_id) {
        next.tenant_contact_id = tenantIdParam;
      }
      if (!next.tenant_contact_id && unitInfo?.tenant_contact_id) {
        next.tenant_contact_id = unitInfo.tenant_contact_id;
      }
      if ((!next.rent_amount || next.rent_amount === 0) && unitInfo?.rent_price) {
        next.rent_amount = Number(unitInfo.rent_price);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitInfo?.id, tenantIdParam]);

  // CIB: o valor mestre vive em `units.cib`. Se a unidade já tem CIB, ele prevalece
  // sobre o valor legado gravado em `leases.cib` (fallback apenas quando a unit está vazia).
  useEffect(() => {
    if (!unitCib) return;
    setFormData((prev) => (prev.cib === unitCib ? prev : { ...prev, cib: unitCib }));
  }, [unitCib]);



  const needsSpouseData =
    guarantorData.estadoCivil === "Casado(a)" || guarantorData.estadoCivil === "União Estável";

  const handleGuarantorCepBlur = () => {
    handleCepBlur(guarantorData.cep || "", (result) => {
      setGuarantorData((prev) => ({
        ...prev,
        endereco: result.address || prev.endereco,
        cidade: result.city || prev.cidade,
        estado: result.state || prev.estado,
      }));
    });
  };

  const nextAdjustmentDate = useMemo(() => {
    if (!formData.start_date) return null;
    try {
      return format(addYears(new Date(formData.start_date), 1), "yyyy-MM-dd");
    } catch {
      return null;
    }
  }, [formData.start_date]);

  // Tenants list
  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ["contacts-tenants", user?.id, searchTerm],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("contacts")
        .select("id, name, email, phone, whatsapp, document_number, document_type")
        .eq("broker_id", effectiveBrokerId || user.id)
        .contains("categories", ["Inquilino"])
        .order("name");
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const selectedTenant = tenants?.find((t) => t.id === formData.tenant_contact_id);

  // Auto-populate billing contact when tenant changes (only if fields are still empty)
  useEffect(() => {
    if (!selectedTenant) return;
    setBillingContact((prev) => ({
      name: prev.name || selectedTenant.name || "",
      email: prev.email || selectedTenant.email || "",
      whatsapp: prev.whatsapp || formatWhatsAppDisplay(selectedTenant.whatsapp || selectedTenant.phone || ""),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id]);


  // Managed units list (used in the "unit" step) — mostra TODOS os imóveis de locação
  const { data: managedUnits, isLoading: loadingManagedUnits } = useQuery({
    queryKey: ["managed-units-for-lease", effectiveBrokerId, user?.id, unitSearchTerm],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("units")
        .select("id, unit_number, address, city, state, owner_contact_id, is_occupied, is_managed, intent_type")
        .eq("broker_id", effectiveBrokerId || user.id)
        .eq("is_managed", true)
        .in("intent_type", ["rental", "both"])
        .order("unit_number");
      if (unitSearchTerm) {
        query = query.or(
          `unit_number.ilike.%${unitSearchTerm}%,address.ilike.%${unitSearchTerm}%,city.ilike.%${unitSearchTerm}%`
        );
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      const all = data || [];

      // Inquilino do contrato ativo (para os imóveis ocupados)
      const occupiedIds = all.filter((u: any) => u.is_occupied).map((u: any) => u.id);
      const tenantByUnit: Record<string, string> = {};
      if (occupiedIds.length > 0) {
        const { data: activeLeases } = await supabase
          .from("leases")
          .select("unit_id, tenant:contacts!leases_tenant_contact_id_fkey(name)")
          .in("unit_id", occupiedIds)
          .eq("status", "active");
        (activeLeases || []).forEach((l: any) => {
          if (l.tenant?.name && !tenantByUnit[l.unit_id]) tenantByUnit[l.unit_id] = l.tenant.name;
        });
      }

      // Livres primeiro, ocupados depois — todos visíveis
      return all
        .map((u: any) => ({ ...u, active_tenant_name: tenantByUnit[u.id] || null }))
        .sort((a: any, b: any) => (a.is_occupied === b.is_occupied ? 0 : a.is_occupied ? 1 : -1));
    },
    enabled: !!user && !isEditMode && !unitIdParam,
  });

  // Dados do imóvel usados como default dos encargos (IPTU / seguro)
  const { data: unitChargeDefaults } = useQuery({
    queryKey: ["unit-charge-defaults", effectiveUnitId],
    queryFn: async () => {
      const { data } = await supabase
        .from("units")
        .select("iptu, obligations_config")
        .eq("id", effectiveUnitId)
        .maybeSingle();
      return (data as { iptu: number | null; obligations_config: any } | null) ?? null;
    },
    enabled: !!user && !!effectiveUnitId,
  });

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  const canProceed = () => {
    switch (step) {
      case "unit":
        return !!effectiveUnitId;
      case "tenant":
        return !!formData.tenant_contact_id;
      case "financial": {
        const endDateValid =
          formData.is_indefinite_term ||
          !formData.end_date ||
          formData.end_date >= formData.start_date;
        return (
          formData.rent_amount > 0 &&
          formData.due_day >= 1 &&
          formData.due_day <= 31 &&
          endDateValid
        );
      }
      case "guarantee":
        if (formData.guarantee_type === "fiador") {
          const hasBasicInfo = !!(guarantorData.nome && guarantorData.cpf);
          if (needsSpouseData) {
            return hasBasicInfo && !!guarantorData.conjuge?.nome && !!guarantorData.conjuge?.cpf;
          }
          return hasBasicInfo;
        }
        return true;
      case "payment":
        return true;
      case "billing":
        return true;
      case "compliance":
        return true;

      default:
        return false;
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) setStep(STEPS[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) setStep(STEPS[currentIndex + 1].id);
  };

  const handleSubmit = async () => {
    if (!effectiveUnitId) {
      toast({ title: "Unidade não definida", variant: "destructive" });
      return;
    }
    if (!formData.tenant_contact_id) {
      toast({ title: "Selecione um inquilino", variant: "destructive" });
      setStep("tenant");
      return;
    }
    if (!formData.rent_amount || formData.rent_amount <= 0) {
      toast({ title: "Informe o valor do aluguel", variant: "destructive" });
      setStep("financial");
      return;
    }

    try {
      const finalGuarantorData =
        formData.guarantee_type === "fiador" && guarantorData.nome ? guarantorData : null;
      const finalPaymentInfo =
        paymentInfo.chavePix || paymentInfo.banco ? paymentInfo : null;

      // Create/update guarantor contact if fiador was manually filled
      if (
        formData.guarantee_type === "fiador" &&
        guarantorData.nome &&
        !selectedGuarantorContactId &&
        user
      ) {
        try {
          const { data: existingContact } = await supabase
            .from("contacts")
            .select("id, categories")
            .eq("broker_id", effectiveBrokerId || user.id)
            .eq("document_number", guarantorData.cpf)
            .maybeSingle();

          if (existingContact) {
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
        }
      }

      const leaseData = {
        unit_id: effectiveUnitId,
        unit_subdivision_id: formData.unit_subdivision_id || null,
        tenant_contact_id: formData.tenant_contact_id,
        owner_contact_id: ownerContactId || undefined,
        rent_amount: formData.rent_amount,
        admin_fee_percentage: formData.admin_fee_percentage,
        due_day: formData.due_day,
        deposit_amount: formData.deposit_amount,
        start_date: formData.start_date,
        end_date: formData.is_indefinite_term ? null : formData.end_date || null,
        cib: formData.cib || undefined,
        is_dimob_deductible: formData.is_dimob_deductible,
        notes: formData.notes || undefined,
        adjustment_index: formData.adjustment_index,
        next_adjustment_date: formData.next_adjustment_date || undefined,
        guarantee_type: formData.guarantee_type,
        guarantor_data: finalGuarantorData,
        payment_info: finalPaymentInfo,
        is_indefinite_term: formData.is_indefinite_term,
        adjustment_periodicity_months: formData.adjustment_periodicity_months,
        fire_insurance: formData.fire_insurance.enabled ? formData.fire_insurance : null,
        iptu_charge: formData.iptu_charge.enabled ? formData.iptu_charge : null,
        additional_obligations: (formData.additional_obligations || []).filter((o) => o.enabled),
        billing_automation: (isEditMode && editLease
          ? {
              ...(editLease.billing_automation || {}),
              billing_contact: {
                name: billingContact.name,
                email: billingContact.email,
                whatsapp: billingWhatsAppStored(),
              },
            }
          : {
              reminder_5_days: true,
              reminder_due_day: true,
              reminder_3_days_late: true,
              send_method: "whatsapp" as const,
              billing_contact: {
                name: billingContact.name,
                email: billingContact.email,
                whatsapp: billingWhatsAppStored(),
              },
            }) as any,
      };

      let resultId = editLeaseId || "";
      let shouldOfferProjection = false;

      if (isEditMode && editLease) {
        // Promoção de contrato pendente de configuração → ativo
        const wasPending = editLease.status === "pending";
        let promoted = false;
        if (wasPending) {
          const missing: string[] = [];
          if (!formData.tenant_contact_id) missing.push("inquilino");
          if (!formData.rent_amount || formData.rent_amount <= 0) missing.push("valor do aluguel");
          if (!formData.start_date) missing.push("data de início");
          if (!formData.due_day || formData.due_day < 1 || formData.due_day > 31)
            missing.push("dia de vencimento");

          if (missing.length > 0) {
            toast({
              title: "Faltam informações para ativar o contrato",
              description: `Preencha: ${missing.join(", ")}.`,
              variant: "destructive",
            });
            setStep(missing.includes("inquilino") ? "tenant" : "financial");
            return;
          }
          (leaseData as any).status = "active";
          (leaseData as any).contract_status = "active";
          promoted = true;
          shouldOfferProjection = true;
        }

        await updateLease.mutateAsync({ id: editLease.id, data: leaseData });

        // Herança automática da Matriz de Responsabilidades ao ativar o contrato
        if (promoted) {
          try {
            await inheritObligationsConfigFromLease({
              leaseId: editLease.id,
              unitId: effectiveUnitId,
              dueDay: Number(formData.due_day) || 10,
              tenantContactId: formData.tenant_contact_id || null,
              ownerContactId: ownerContactId || null,
              fireInsurance: formData.fire_insurance?.enabled ? formData.fire_insurance : null,
              iptuCharge: formData.iptu_charge?.enabled ? formData.iptu_charge : null,
              additionalObligations: (formData.additional_obligations || []).filter(
                (o) => o.enabled
              ),
            });
            await markLeaseObligationsInherited(
              editLease.id,
              (editLease.metadata as Record<string, unknown>) || {}
            );
            queryClient.invalidateQueries({ queryKey: ["unit-obligations-config", effectiveUnitId] });
            queryClient.invalidateQueries({ queryKey: ["asset-health"] });
          } catch (inheritError) {
            console.error("Falha ao herdar configuração de obrigações:", inheritError);
          }
        }

        toast({
          title: promoted ? "Contrato finalizado e ativado" : "Contrato atualizado com sucesso!",
          description: promoted
            ? "As obrigações foram herdadas para o imóvel e aguardam sua revisão."
            : undefined,
        });
        resultId = editLease.id;
      } else {
        const result = await createLease.mutateAsync(leaseData);
        resultId = (result as any).id || (result as any).lease?.id || "";

        // Contrato nasce ativo: herda a Matriz de Responsabilidades para o imóvel
        if (resultId) {
          try {
            await inheritObligationsConfigFromLease({
              leaseId: resultId,
              unitId: effectiveUnitId,
              dueDay: Number(formData.due_day) || 10,
              tenantContactId: formData.tenant_contact_id || null,
              ownerContactId: ownerContactId || null,
              fireInsurance: formData.fire_insurance?.enabled ? formData.fire_insurance : null,
              iptuCharge: formData.iptu_charge?.enabled ? formData.iptu_charge : null,
              additionalObligations: (formData.additional_obligations || []).filter(
                (o) => o.enabled
              ),
            });
            await markLeaseObligationsInherited(resultId, {});
            queryClient.invalidateQueries({ queryKey: ["unit-obligations-config", effectiveUnitId] });
            queryClient.invalidateQueries({ queryKey: ["asset-health"] });
          } catch (inheritError) {
            console.error("Falha ao herdar configuração de obrigações:", inheritError);
          }
        }

        toast({
          title: "Contrato criado com sucesso!",
          description: "As obrigações foram herdadas para o imóvel e aguardam sua revisão.",
        });
      }

      // CIB — grava também em `units.cib` (fonte única de verdade a partir de agora).
      // `leases.cib` continua sendo gravado acima por compatibilidade.
      if (effectiveUnitId && formData.cib && formData.cib !== unitCib) {
        try {
          await supabase.from("units").update({ cib: formData.cib }).eq("id", effectiveUnitId);
          queryClient.invalidateQueries({ queryKey: ["unit-cib", effectiveUnitId] });
          queryClient.invalidateQueries({ queryKey: ["dimob-status", effectiveUnitId] });
          queryClient.invalidateQueries({ queryKey: ["unit-detail", effectiveUnitId] });
        } catch (cibError) {
          console.error("Falha ao sincronizar CIB na unidade:", cibError);
        }
      }


      sessionStorage.removeItem(DRAFT_KEY);

      // Lançamentos financeiros só acontecem após confirmação explícita do usuário.
      if (resultId && (!isEditMode || shouldOfferProjection)) {
        setPostProjectionNavId(resultId);
        setProjectionLease({
          id: resultId,
          unit_id: effectiveUnitId,
          tenant_contact_id: formData.tenant_contact_id,
          property_id: selectedUnitInfo?.property_id ?? null,
          rent_amount: Number(formData.rent_amount) || 0,
          due_day: Number(formData.due_day) || 10,
          start_date: formData.start_date,
          end_date: formData.is_indefinite_term ? null : formData.end_date || null,
          next_adjustment_date: formData.next_adjustment_date || null,
          is_indefinite_term: formData.is_indefinite_term,
          fire_insurance: formData.fire_insurance?.enabled ? formData.fire_insurance : null,
          iptu_charge: formData.iptu_charge?.enabled ? formData.iptu_charge : null,
          unit: selectedUnitInfo
            ? { unit_number: selectedUnitInfo.unit_number, address: selectedUnitInfo.address }
            : null,
          tenant: {
            name:
              (tenants || []).find((t: any) => t.id === formData.tenant_contact_id)?.name || null,
          },
        } as LeaseForProjection);
        setProjectionOpen(true);
        return;
      }

      if (resultId) {
        navigate(`/gestao/contratos?id=${resultId}`);
      } else {
        navigate("/gestao/contratos");
      }
    } catch (error) {
      toast({
        title: isEditMode ? "Erro ao atualizar contrato" : "Erro ao criar contrato",
        description: error instanceof Error ? error.message : (error as any)?.message || "Verifique os campos e tente novamente",
        variant: "destructive",
      });
    }
  };

  const isLoading = createLease.isPending || updateLease.isPending;

  // Redirect (never during render — that causes a blank screen)
  useEffect(() => {
    if (user === null) navigate("/auth", { replace: true });
  }, [user, navigate]);

  if (!user) {
    return (
      <AppLayout title="Novo Contrato">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }


  // Loading edit data
  if (isEditMode && loadingEdit) {
    return (
      <AppLayout title="Editar Contrato">
        <SEOHead title="Editar Contrato" description="Edição de contrato" path="/gestao/contratos/novo" noIndex />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout title={isEditMode ? "Editar Contrato" : "Novo Contrato"}>
      <SEOHead
        title={isEditMode ? "Editar Contrato" : "Novo Contrato"}
        description="Wizard de criação de contrato de locação"
        path="/gestao/contratos/novo"
        noIndex
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            sessionStorage.removeItem(DRAFT_KEY);
            navigate("/gestao/contratos");
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Contratos
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">
            {isPendingSetup ? "Finalizar Contrato" : isEditMode ? "Editar Contrato" : "Novo Contrato"}
          </h1>
          {unitName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3" />
              {unitName}
            </p>
          )}
        </div>
      </div>

      {isPendingSetup && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Este contrato foi criado automaticamente a partir do cadastro do imóvel e ainda
            precisa ser finalizado.
          </p>
        </div>
      )}

      {/* Stepper */}
      <div className="w-full overflow-x-auto -mx-1 px-1 mb-4">
        <div className="flex items-center justify-start gap-0.5 sm:gap-1 py-2 sm:py-3 min-w-max">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => {
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

      {/* Step content */}
      <Card>
        <CardContent className="p-4 sm:p-6 pb-24">
          {/* Unit selection */}
          {step === "unit" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                Para que um imóvel apareça aqui, ative <strong>"Habilitar Gestão de Ativo"</strong> nas configurações da unidade.
              </div>

              <div className="space-y-2">
                <Label>Buscar Imóvel</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou endereço..."
                    value={unitSearchTerm}
                    onChange={(e) => setUnitSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selecionar Imóvel *</Label>
                {loadingManagedUnits ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : managedUnits && managedUnits.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {managedUnits.map((unit: any) => (
                      <div
                        key={unit.id}
                        onClick={() => {
                          setSelectedUnitId(unit.id);
                          setSelectedUnitInfo(unit);
                        }}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                          selectedUnitId === unit.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted border border-transparent"
                        )}
                      >
                        <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{unit.unit_number || "Sem identificação"}</p>
                          {unit.address && (
                            <p className="text-xs text-muted-foreground truncate">{unit.address}</p>
                          )}
                          {unit.city && (
                            <p className="text-xs text-muted-foreground truncate">
                              {unit.city}
                              {unit.state ? `/${unit.state}` : ""}
                            </p>
                          )}
                          {unit.is_occupied && (
                            <p className="text-[11px] text-amber-700 truncate">
                              Já possui contrato ativo
                              {unit.active_tenant_name ? ` com ${unit.active_tenant_name}` : ""} — é
                              possível criar um contrato adicional.
                            </p>
                          )}
                        </div>
                        {unit.is_occupied && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 flex-shrink-0">
                            Ocupado
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum imóvel com gestão ativa encontrado.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 px-4">
                      Acesse as configurações da unidade e ative "Habilitar Gestão de Ativo".
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/gestao/alugueis")}>
                      Ir para Ativos em Gestão
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tenant */}
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
                  <div className="max-h-72 overflow-y-auto space-y-2 border rounded-lg p-2">
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
                    <p className="text-sm text-muted-foreground">Nenhum inquilino encontrado.</p>
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

          {/* Financial */}
          {step === "financial" && (
            <LeaseFinancialStep
              value={formData as unknown as LeaseFinancialValue}
              onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
              unit={unitChargeDefaults}
              tenantContact={{
                id: formData.tenant_contact_id || null,
                name: selectedTenant?.name || editLease?.tenant?.name || null,
              }}
              ownerContact={{
                id: ownerContactId,
                name: ownerContactInfo?.name || editLease?.owner?.name || null,
              }}
              adjustmentLocked={isEditMode}
              header={
                showSubdivisionSelect ? (
                  <div className="space-y-2">
                    <Label>Fração</Label>
                    <Select
                      value={formData.unit_subdivision_id ?? "none"}
                      onValueChange={(v) => {
                        const id = v === "none" ? null : v;
                        const fraction = subdivisions.find((s) => s.id === id);
                        setFormData((prev) => ({
                          ...prev,
                          unit_subdivision_id: id,
                          rent_amount:
                            fraction?.rent_price != null
                              ? Number(fraction.rent_price)
                              : prev.rent_amount,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Imóvel inteiro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Imóvel inteiro (sem fração)</SelectItem>
                        {subdivisions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                            {s.area != null ? ` — ${s.area}m²` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Opcional. Selecione a fração quando o contrato for de apenas uma parte do
                      imóvel — o valor do aluguel é preenchido automaticamente e pode ser ajustado.
                    </p>
                  </div>
                ) : null
              }
            />
          )}

          {/* Guarantee */}
          {step === "guarantee" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Garantia *</Label>
                <RadioGroup
                  value={formData.guarantee_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, guarantee_type: v as GuaranteeType })
                  }
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
                        <Label htmlFor={opt.value} className="font-medium cursor-pointer text-sm">
                          {opt.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {formData.guarantee_type === "fiador" && (
                <div className="space-y-4 pt-3 border-t">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Dados do Fiador</p>

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
                        onChange={(e) =>
                          setGuarantorData({ ...guarantorData, nome: e.target.value })
                        }
                        placeholder="Nome do fiador"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">CPF *</Label>
                      <Input
                        value={guarantorData.cpf}
                        onChange={(e) => setGuarantorData({ ...guarantorData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">RG</Label>
                      <Input
                        value={guarantorData.rg || ""}
                        onChange={(e) => setGuarantorData({ ...guarantorData, rg: e.target.value })}
                        placeholder="RG"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Profissão</Label>
                      <Input
                        value={guarantorData.profissao || ""}
                        onChange={(e) =>
                          setGuarantorData({ ...guarantorData, profissao: e.target.value })
                        }
                        placeholder="Profissão"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Estado Civil *</Label>
                      <Select
                        value={guarantorData.estadoCivil}
                        onValueChange={(v) =>
                          setGuarantorData({ ...guarantorData, estadoCivil: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CIVIL_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Endereço do Fiador</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">CEP</Label>
                        <div className="relative">
                          <Input
                            value={guarantorData.cep || ""}
                            onChange={(e) =>
                              setGuarantorData({ ...guarantorData, cep: formatCep(e.target.value) })
                            }
                            onBlur={handleGuarantorCepBlur}
                            placeholder="00000-000"
                            disabled={isLoadingCep}
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
                          onChange={(e) =>
                            setGuarantorData({ ...guarantorData, endereco: e.target.value })
                          }
                          placeholder="Rua, número"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Cidade</Label>
                        <Input
                          value={guarantorData.cidade}
                          onChange={(e) =>
                            setGuarantorData({ ...guarantorData, cidade: e.target.value })
                          }
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">UF</Label>
                        <Input
                          value={guarantorData.estado}
                          onChange={(e) =>
                            setGuarantorData({
                              ...guarantorData,
                              estado: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>

                  {needsSpouseData && (
                    <div className="space-y-3 pt-3 border-t border-dashed">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <p className="text-sm font-medium text-amber-700">
                          Vênia Conjugal Obrigatória
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Para fiador casado(a) ou em união estável, é necessário os dados do cônjuge
                        (Art. 1.647, III CC).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <Label>Nome do Cônjuge *</Label>
                          <Input
                            value={guarantorData.conjuge?.nome || ""}
                            onChange={(e) =>
                              setGuarantorData({
                                ...guarantorData,
                                conjuge: {
                                  ...guarantorData.conjuge,
                                  nome: e.target.value,
                                  cpf: guarantorData.conjuge?.cpf || "",
                                },
                              })
                            }
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CPF do Cônjuge *</Label>
                          <Input
                            value={guarantorData.conjuge?.cpf || ""}
                            onChange={(e) =>
                              setGuarantorData({
                                ...guarantorData,
                                conjuge: {
                                  ...guarantorData.conjuge,
                                  cpf: e.target.value,
                                  nome: guarantorData.conjuge?.nome || "",
                                },
                              })
                            }
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>RG do Cônjuge</Label>
                          <Input
                            value={guarantorData.conjuge?.rg || ""}
                            onChange={(e) =>
                              setGuarantorData({
                                ...guarantorData,
                                conjuge: {
                                  ...guarantorData.conjuge,
                                  rg: e.target.value,
                                  nome: guarantorData.conjuge?.nome || "",
                                  cpf: guarantorData.conjuge?.cpf || "",
                                },
                              })
                            }
                            placeholder="RG"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">Imóvel em Garantia (opcional)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Endereço do Imóvel</Label>
                        <Input
                          value={guarantorData.imovelGarantia?.endereco || ""}
                          onChange={(e) =>
                            setGuarantorData({
                              ...guarantorData,
                              imovelGarantia: {
                                ...guarantorData.imovelGarantia,
                                endereco: e.target.value,
                                matricula: guarantorData.imovelGarantia?.matricula || "",
                              },
                            })
                          }
                          placeholder="Endereço completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Matrícula</Label>
                        <Input
                          value={guarantorData.imovelGarantia?.matricula || ""}
                          onChange={(e) =>
                            setGuarantorData({
                              ...guarantorData,
                              imovelGarantia: {
                                ...guarantorData.imovelGarantia,
                                matricula: e.target.value,
                                endereco: guarantorData.imovelGarantia?.endereco || "",
                              },
                            })
                          }
                          placeholder="Nº da matrícula"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cartório</Label>
                        <Input
                          value={guarantorData.imovelGarantia?.cartorio || ""}
                          onChange={(e) =>
                            setGuarantorData({
                              ...guarantorData,
                              imovelGarantia: {
                                ...guarantorData.imovelGarantia,
                                cartorio: e.target.value,
                                endereco: guarantorData.imovelGarantia?.endereco || "",
                                matricula: guarantorData.imovelGarantia?.matricula || "",
                              },
                            })
                          }
                          placeholder="Nome do cartório"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment */}
          {step === "payment" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Dados para Pagamento</Label>
                <p className="text-sm text-muted-foreground">
                  Informe como o inquilino deve realizar o pagamento do aluguel. Estes dados aparecerão
                  no contrato.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Tipo de Pagamento</Label>
                <Select
                  value={paymentInfo.tipo}
                  onValueChange={(v) =>
                    setPaymentInfo({ ...paymentInfo, tipo: v as "pix" | "banco" | "boleto" })
                  }
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

              {paymentInfo.tipo === "boleto" && (() => {
                const emissao = paymentInfo.emissao_boleto ?? "asaas";
                return (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados do Pagador</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="font-medium">{selectedTenant?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {(selectedTenant as any)?.document_type || "CPF/CNPJ"}
                        </p>
                        <p className="font-medium">
                          {(selectedTenant as any)?.document_number ? (
                            (selectedTenant as any).document_number
                          ) : (
                            <span className="text-amber-600 text-xs">
                              Não informado — edite o contato do inquilino antes de emitir boleto
                            </span>
                          )}
                        </p>
                      </div>
                      {selectedTenant?.email && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-muted-foreground">E-mail (para envio do boleto)</p>
                          <p className="font-medium">{selectedTenant.email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configurações de cobrança */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configurações de Cobrança</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Multa por atraso (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          step={0.5}
                          placeholder="2"
                          value={paymentInfo.fine_value ?? ""}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, fine_value: e.target.value !== "" ? Number(e.target.value) : undefined })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Juros ao mês (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={5}
                          step={0.1}
                          placeholder="1"
                          value={paymentInfo.interest_value ?? ""}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, interest_value: e.target.value !== "" ? Number(e.target.value) : undefined })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Desconto (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0"
                          value={paymentInfo.discount_value ?? ""}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, discount_value: e.target.value !== "" ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    </div>
                    {(paymentInfo.discount_value ?? 0) > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Dias antes do vencimento para desconto</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          placeholder="5"
                          value={paymentInfo.discount_due_date_limit_days ?? ""}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, discount_due_date_limit_days: e.target.value !== "" ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Envio */}
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Enviar boleto por</p>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentInfo.send_email ?? true}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, send_email: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">E-mail</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentInfo.send_whatsapp ?? false}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, send_whatsapp: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">WhatsApp</span>
                      </label>
                    </div>
                  </div>

                  {/* Escolha do modo de emissão */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Como o boleto será emitido?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={emissao === "propria" ? "default" : "outline"}
                        onClick={() => setPaymentInfo({ ...paymentInfo, emissao_boleto: "propria" })}
                      >
                        Vou emitir por conta própria
                      </Button>
                      <Button
                        type="button"
                        variant={emissao === "asaas" ? "default" : "outline"}
                        onClick={() => setPaymentInfo({ ...paymentInfo, emissao_boleto: "asaas" })}
                      >
                        Usar emissão automática via Asaas
                      </Button>
                    </div>
                  </div>

                  {/* Info */}
                  {emissao === "propria" ? (
                    <div className="flex items-start gap-2 p-3 bg-muted/50 border rounded-lg">
                      <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Você é responsável por gerar e controlar este boleto fora do sistema. Os dados acima ficam
                        registrados no contrato como referência.
                      </p>
                    </div>
                  ) : !hasActiveAsaasAccount ? (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-xs text-amber-700 dark:text-amber-500">
                          Você ainda não tem uma subconta Asaas configurada. Configure em Configurações → Configuração
                          de Boleto Asaas antes de emitir cobranças automáticas.
                        </p>
                        <Button type="button" size="sm" variant="outline" onClick={() => navigate("/settings")}>
                          Ir para Configurações
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-800">
                      <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-600 dark:text-blue-500">
                        Boletos emitidos automaticamente pelo <strong>Asaas</strong> a cada vencimento com as configurações acima.
                      </p>
                    </div>
                  )}
                </div>
                );
              })()}

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  💡 Estas informações serão incluídas na Cláusula 4.2 do contrato de locação.
                </p>
              </div>
            </div>
          )}

          {/* Billing contact */}
          {step === "billing" && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-1">Contato para Cobrança</p>
                <p className="text-xs text-muted-foreground">
                  Informe os dados de contato para envio automático de avisos de vencimento e cobranças.
                  A automação será ativada após a criação do contrato, na aba <strong>Cobrança</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nome do Contato *</Label>
                <Input
                  value={billingContact.name}
                  onChange={(e) => setBillingContact((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do responsável pelo pagamento"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-preenchido com o nome do inquilino selecionado.
                </p>
              </div>

              <div className="space-y-2">
                <Label>E-mail para Cobrança</Label>
                <Input
                  type="email"
                  value={billingContact.email}
                  onChange={(e) => setBillingContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp para Cobrança</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 border rounded-md bg-muted text-sm text-muted-foreground select-none whitespace-nowrap">
                    🇧🇷 +55
                  </div>
                  <Input
                    value={billingContact.whatsapp}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                      let formatted: string = digits;
                      if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                      if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                      setBillingContact((p) => ({ ...p, whatsapp: formatted }));
                    }}
                    placeholder="(11) 99999-9999"
                    className="flex-1"
                    inputMode="numeric"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  DDD + número com 9 dígitos. O código +55 (Brasil) é adicionado automaticamente.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <strong>Importante:</strong> a automação de cobranças só será ativada após a criação do contrato,
                na aba <strong>Cobrança</strong> do detalhe do contrato. Aqui você apenas pré-configura o contato.
              </div>
            </div>
          )}

          {/* Compliance */}

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
                        <p>
                          O CIB substitui o número de inscrição do IPTU para identificar imóveis perante
                          a Receita Federal. Obrigatório para DIMOB.
                        </p>
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

              <div className="p-3 border rounded-lg bg-muted/30 space-y-2 text-sm">
                <p className="font-medium">Resumo do Contrato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-xs sm:text-sm">
                  <span>Inquilino:</span>
                  <span className="font-medium text-foreground">
                    {selectedTenant?.name || "-"}
                  </span>
                  <span>Aluguel:</span>
                  <span className="font-medium text-foreground">
                    {formData.rent_amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <span>Vencimento:</span>
                  <span className="font-medium text-foreground">Dia {formData.due_day}</span>
                  <span>Garantia:</span>
                  <span className="font-medium text-foreground">
                    {GUARANTEE_OPTIONS.find((o) => o.value === formData.guarantee_type)?.label}
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
        </CardContent>
      </Card>

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-4 lg:-mx-8 mt-4 bg-background border-t py-3 px-4 lg:px-8 flex justify-between gap-2">
        <Button variant="outline" disabled={currentIndex === 0} onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        {currentIndex < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading || !canProceed()}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isPendingSetup ? "Finalizar Contrato" : isEditMode ? "Salvar" : "Concluir"}
          </Button>
        )}
      </div>
      <ConfirmLeaseProjectionDialog
        open={projectionOpen}
        onOpenChange={(o) => {
          setProjectionOpen(o);
          if (!o) {
            const id = postProjectionNavId;
            setProjectionLease(null);
            navigate(id ? `/gestao/contratos?id=${id}` : "/gestao/contratos");
          }
        }}
        lease={projectionLease}
      />
    </AppLayout>
  );
}
