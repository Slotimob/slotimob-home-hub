import { useState, useMemo, useEffect, useRef } from "react";
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
  Plus,
} from "lucide-react";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";


import { ContactSelector } from "@/components/ContactSelector";
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
  getInitialRentGrace,
  getInitialRentWithholding,
  normalizeRentDeductions,
  type LeaseFinancialValue,
} from "@/components/assets/LeaseFinancialStep";
import {
  isValidRentDeduction,
  validateSpecialConditions,
} from "@/lib/lease-special-conditions";
import type {
  RentDeductionConfig,
  RentGraceConfig,
  RentWithholdingConfig,
} from "@/hooks/useLeases";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog as ReviewDialog,
  DialogContent as ReviewDialogContent,
  DialogDescription as ReviewDialogDescription,
  DialogFooter as ReviewDialogFooter,
  DialogHeader as ReviewDialogHeader,
  DialogTitle as ReviewDialogTitle,
} from "@/components/ui/dialog";
import {
  inheritObligationsConfigFromLease,
  markLeaseObligationsInherited,
} from "@/lib/lease-obligations-inheritance";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useCreateLease, useUpdateLease, useLeaseUnits, useSetLeaseUnits, type GuarantorData, type PaymentInfo } from "@/hooks/useLeases";
import {
  LeaseExtraUnitsSection,
  EMPTY_EXTRA_UNITS,
  leaseUnitRefsFor,
  validateExtraUnits,
  type LeaseExtraUnitsState,
} from "@/components/assets/LeaseExtraUnitsSection";
import { unitLabel } from "@/components/units/UnitSelector";
import { occupyLeaseUnits, releaseLeaseUnits, leaseUnitRefKey, type LeaseUnitRef } from "@/lib/unit-status-sync";
import { useToast } from "@/hooks/use-toast";
import { cpfCnpjError, onlyDigits } from "@/lib/document-validation";
import { defaultLeasePurpose, type LeasePurpose } from "@/lib/lease-purpose";
import { useCepSearch } from "@/hooks/useCepSearch";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes-guard";
import { useUnitSubdivisions } from "@/hooks/useUnitSubdivisions";
import { useLiveLeaseRefs } from "@/hooks/useLiveLeaseRefs";
import { supabase } from "@/integrations/supabase/client";
import { parseDateOnly, formatDateOnly } from "@/lib/date-only";
import { formatCurrencyBRL } from "@/utils/unitPricing";
import { graceSummary } from "@/lib/lease-special-conditions";
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
  { value: "none" as GuaranteeType, label: "Sem Garantia", description: "Sem caução, fiador ou seguro" },
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

/** Valores das condições especiais como são gravados no contrato. */
const specialConditionsForSave = (fd: {
  rent_grace: RentGraceConfig;
  rent_deductions: RentDeductionConfig[];
  rent_withholding: RentWithholdingConfig;
}) => ({
  rent_grace: fd.rent_grace?.enabled ? fd.rent_grace : null,
  rent_deductions: (fd.rent_deductions || []).filter((d) => d.enabled && isValidRentDeduction(d)),
  rent_withholding: fd.rent_withholding?.enabled ? fd.rent_withholding : null,
});

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
  guarantee_type: "" as GuaranteeType | "",
  is_indefinite_term: false,
  adjustment_periodicity_months: 12,
  next_adjustment_date: "",
  fire_insurance: getInitialFireInsurance(),
  iptu_charge: getInitialIptuCharge(),
  additional_obligations: getInitialAdditionalObligations(),
  rent_grace: getInitialRentGrace(format(new Date(), "yyyy-MM-dd")) as RentGraceConfig,
  rent_deductions: [] as RentDeductionConfig[],
  rent_withholding: getInitialRentWithholding() as RentWithholdingConfig,
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
  const dealIdParam = editLeaseId ? null : searchParams.get("dealId");

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
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [selectedUnitInfo, setSelectedUnitInfo] = useState<any>(null);
  const [formData, setFormData] = useState(getInitialFormData);
  /** Condições especiais como vieram do banco (edição), para detectar mudança. */
  const initialSpecialRef = useRef<string | null>(null);
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);
  const [guarantorData, setGuarantorData] = useState<GuarantorData>(getInitialGuarantor);
  const guarantorCpfError = onlyDigits(guarantorData.cpf) ? cpfCnpjError(guarantorData.cpf, "CPF") : null;
  const [selectedGuarantorContactId, setSelectedGuarantorContactId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(getInitialPayment);
  const [billingContact, setBillingContact] = useState({
    name: "",
    email: "",
    whatsapp: "", // display format: "(11) 99999-9999"
    contact_id: "" as string,
  });
  const [draftLoaded, setDraftLoaded] = useState(false);
  // Contrato com vários imóveis (principal = imóvel escolhido acima)
  const [extraUnits, setExtraUnits] = useState<LeaseExtraUnitsState>(EMPTY_EXTRA_UNITS);
  const [leasePurpose, setLeasePurpose] = useState<LeasePurpose>("residencial");
  const [purposeTouched, setPurposeTouched] = useState(false);
  const initialLeaseUnitRefsRef = useRef<LeaseUnitRef[] | null>(null);
  const setLeaseUnits = useSetLeaseUnits();
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
  const { data: editLeaseUnits, isSuccess: leaseUnitsLoaded } = useLeaseUnits(editLeaseId);

  // Hidrata os imóveis do contrato (modo edição)
  useEffect(() => {
    if (!editLeaseUnits || initialLeaseUnitRefsRef.current) return;
    const toRef = (r: any): LeaseUnitRef => ({ unit_id: r.unit_id, unit_subdivision_id: r.unit_subdivision_id ?? null });
    initialLeaseUnitRefsRef.current = editLeaseUnits.map(toRef);
    const extras = editLeaseUnits.filter((r) => !r.is_primary);
    const hasShares = editLeaseUnits.some((r) => r.share_percent != null);
    const units: LeaseExtraUnitsState["units"] = [];
    const fractions: Record<string, string[] | null> = {};
    const fractionLabels: Record<string, string> = {};
    extras.forEach((r: any) => {
      if (!units.some((u) => u.id === r.unit_id)) {
        units.push({
          id: r.unit_id,
          unit_number: r.unit?.unit_number || "Imóvel",
          is_standalone: !!r.unit?.is_standalone,
          tenant_contact_id: null,
          property_id: null,
          property_name: r.unit?.property?.name ?? null,
        });
      }
      if (r.unit_subdivision_id) {
        fractions[r.unit_id] = [...(fractions[r.unit_id] || []), r.unit_subdivision_id];
        if (r.subdivision?.label) fractionLabels[r.unit_subdivision_id] = r.subdivision.label;
      } else if (!(r.unit_id in fractions)) {
        fractions[r.unit_id] = null;
      }
    });
    setExtraUnits({
      enabled: extras.length > 0,
      units,
      fractions,
      fractionLabels,
      shareEnabled: hasShares,
      shares: hasShares
        ? Object.fromEntries(editLeaseUnits.map((r) => [leaseUnitRefKey(toRef(r)), Number(r.share_percent) || 0]))
        : {},
    });
  }, [editLeaseUnits]);

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

  // Contratos vivos (active/pending) no imóvel principal — o próprio contrato não conta na edição
  const { wholeUnitBusy, busySubdivisionIds } = useLiveLeaseRefs(effectiveUnitId || null, editLeaseId);
  const anyFractionBusy = subdivisions.some((s) => busySubdivisionIds.has(s.id));
  const wholeOptionBusy = wholeUnitBusy || anyFractionBusy;
  const primarySelectionBusy = !effectiveUnitId
    ? false
    : showSubdivisionSelect
      ? formData.unit_subdivision_id
        ? busySubdivisionIds.has(formData.unit_subdivision_id) || wholeUnitBusy
        : wholeOptionBusy
      : wholeUnitBusy || (!!formData.unit_subdivision_id && busySubdivisionIds.has(formData.unit_subdivision_id));
  // Fração ocupada selecionada (ex.: veio do link): limpa a seleção
  useEffect(() => {
    const id = formData.unit_subdivision_id;
    if (id && busySubdivisionIds.has(id)) setFormData((prev) => ({ ...prev, unit_subdivision_id: null }));
  }, [busySubdivisionIds, formData.unit_subdivision_id]);

  // Link "Criar contrato" de uma fração: ?unitId=<id>&subdivisionId=<id>
  const subdivisionIdParam = searchParams.get("subdivisionId");
  const subdivisionParamAppliedRef = useRef(false);
  useEffect(() => {
    if (isEditMode || !subdivisionIdParam || subdivisionParamAppliedRef.current) return;
    const fraction = subdivisions.find((s) => s.id === subdivisionIdParam);
    if (!fraction) return;
    subdivisionParamAppliedRef.current = true;
    setFormData((prev) => ({
      ...prev,
      unit_subdivision_id: fraction.id,
      rent_amount: fraction.rent_price != null ? Number(fraction.rent_price) : prev.rent_amount,
    }));
  }, [subdivisions, subdivisionIdParam, isEditMode]);



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
          if (draft.formData)
            setFormData((prev) => {
              const merged = { ...prev, ...draft.formData };
              return {
                ...merged,
                rent_grace: merged.rent_grace ?? getInitialRentGrace(merged.start_date),
                rent_deductions: normalizeRentDeductions(merged.rent_deductions),
                rent_withholding: merged.rent_withholding ?? getInitialRentWithholding(),
              };
            });
          if (draft.guarantorData) setGuarantorData(draft.guarantorData);
          if (draft.paymentInfo) setPaymentInfo(draft.paymentInfo);
          if (draft.billingContact) setBillingContact(draft.billingContact);
          if (draft.selectedUnitId) setSelectedUnitId(draft.selectedUnitId);
          if (draft.selectedUnitInfo) setSelectedUnitInfo(draft.selectedUnitInfo);
          if (draft.extraUnits) setExtraUnits({ ...EMPTY_EXTRA_UNITS, ...draft.extraUnits });
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
          extraUnits,
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
    extraUnits,
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
      rent_grace: ((editLease as any).rent_grace as RentGraceConfig) ?? getInitialRentGrace(editLease.start_date),
      rent_deductions: normalizeRentDeductions((editLease as any).rent_deductions),
      rent_withholding:
        ((editLease as any).rent_withholding as RentWithholdingConfig) ?? getInitialRentWithholding(),
    });
    initialSpecialRef.current = JSON.stringify(
      specialConditionsForSave({
        rent_grace: (editLease as any).rent_grace ?? getInitialRentGrace(editLease.start_date),
        rent_deductions: normalizeRentDeductions((editLease as any).rent_deductions),
        rent_withholding: (editLease as any).rent_withholding ?? getInitialRentWithholding(),
      })
    );
    {
      const p = (editLease.metadata as any)?.purpose;
      if (p === "residencial" || p === "comercial") {
        setLeasePurpose(p);
        setPurposeTouched(true);
      }
    }
    if (editLease.guarantor_data) setGuarantorData(editLease.guarantor_data);
    if (editLease.payment_info) setPaymentInfo(editLease.payment_info);
    if (editLease.billing_automation?.billing_contact) {
      const bc = editLease.billing_automation.billing_contact;
      setBillingContact({
        name: bc.name || "",
        // `email_to` é a fonte de verdade dos avisos automáticos.
        email: editLease.billing_automation.email_to || bc.email || "",
        whatsapp: formatWhatsAppDisplay(bc.whatsapp || ""),
        contact_id: bc.contact_id || "",
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

  // ===== CRM → contrato =====
  const { data: crmDeal } = useQuery({
    queryKey: ["crm-deal-for-lease", dealIdParam, effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, lead_id, contact_id, unit_id, estimated_value, lead:leads!deals_lead_id_fkey(id, name, email, phone, cpf_cnpj, address, city, state)")
        .eq("id", dealIdParam!)
        .eq("broker_id", effectiveBrokerId || user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!dealIdParam,
  });

  const [crmContact, setCrmContact] = useState<{ id: string; name: string; categories: string[] } | null>(null);
  const [crmUsingTenant, setCrmUsingTenant] = useState(false);

  useEffect(() => {
    if (!crmDeal || !user) return;
    let cancelled = false;
    (async () => {
      const brokerId = effectiveBrokerId || user.id;
      const sel = "id, name, categories, email, phone, whatsapp";
      let found: any = null;
      if (crmDeal.contact_id) {
        const { data } = await supabase.from("contacts").select(sel).eq("id", crmDeal.contact_id).maybeSingle();
        found = data;
      }
      if (!found && crmDeal.lead_id) {
        const { data } = await supabase
          .from("contacts").select(sel).eq("broker_id", brokerId).eq("legacy_lead_id", crmDeal.lead_id).limit(1);
        found = data?.[0] ?? null;
      }
      const lead = crmDeal.lead;
      if (!found && lead?.email) {
        const { data } = await supabase
          .from("contacts").select(sel).eq("broker_id", brokerId).ilike("email", lead.email.replace(/[%_\\]/g, "\\$&")).limit(1);
        found = data?.[0] ?? null;
      }
      const digits = (lead?.phone || "").replace(/\D/g, "");
      if (!found && digits.length >= 8) {
        const tail = digits.slice(-8);
        const { data } = await supabase
          .from("contacts").select(sel).eq("broker_id", brokerId)
          .or(`phone.ilike.%${tail}%,whatsapp.ilike.%${tail}%`).limit(50);
        found = (data || []).find((c: any) =>
          [c.phone, c.whatsapp].some((p: string | null) => p && p.replace(/\D/g, "") === digits),
        ) ?? null;
      }
      if (!cancelled) {
        setCrmContact(found ? { id: found.id, name: found.name, categories: found.categories || [] } : null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmDeal?.id, effectiveBrokerId, user?.id]);

  // Valor do negócio tem prioridade sobre rent_price da unidade (se o usuário não digitou outro)
  const crmRentAppliedRef = useRef(false);
  useEffect(() => {
    if (isEditMode || crmRentAppliedRef.current || !crmDeal) return;
    const value = Number(crmDeal.estimated_value) || 0;
    crmRentAppliedRef.current = true;
    if (value <= 0) return;
    setFormData((prev) => {
      const current = Number(prev.rent_amount) || 0;
      const unitRent = Number(unitInfo?.rent_price) || 0;
      if (current === 0 || (unitRent > 0 && current === unitRent)) return { ...prev, rent_amount: value };
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmDeal?.id, isEditMode]);

  useEffect(() => {
    if (!crmContact || !crmContact.categories.includes("Inquilino")) return;
    setFormData((prev) => (prev.tenant_contact_id ? prev : { ...prev, tenant_contact_id: crmContact.id }));
  }, [crmContact?.id]);

  const useCrmClientAsTenant = async () => {
    if (!crmDeal?.lead || !user) return;
    setCrmUsingTenant(true);
    try {
      let contactId: string;
      if (crmContact) {
        contactId = crmContact.id;
        if (!crmContact.categories.includes("Inquilino")) {
          const categories = [...crmContact.categories, "Inquilino"];
          const { error } = await supabase.from("contacts").update({ categories }).eq("id", contactId);
          if (error) throw error;
          setCrmContact({ ...crmContact, categories });
        }
      } else {
        const lead = crmDeal.lead;
        const doc = (lead.cpf_cnpj || "").replace(/\D/g, "");
        const leadDocError = doc ? cpfCnpjError(doc) : null;
        if (leadDocError) {
          toast({
            title: leadDocError,
            description: "Corrija o CPF/CNPJ do cliente no CRM antes de usá-lo como inquilino.",
            variant: "destructive",
          });
          return;
        }
        const { data, error } = await supabase
          .from("contacts")
          .insert({
            broker_id: effectiveBrokerId || user.id,
            name: lead.name,
            email: lead.email || null,
            phone: lead.phone || null,
            whatsapp: lead.phone || null,
            document_number: doc || null,
            document_type: doc.length === 11 ? "CPF" : doc.length === 14 ? "CNPJ" : null,
            address: lead.address || null,
            city: lead.city || null,
            state: lead.state || null,
            categories: ["Inquilino"],
            legacy_lead_id: lead.id,
          } as any)
          .select("id, name, categories")
          .single();
        if (error) throw error;
        contactId = data.id;
        setCrmContact({ id: data.id, name: data.name, categories: (data.categories as string[]) || ["Inquilino"] });
      }
      setFormData((prev) => ({ ...prev, tenant_contact_id: contactId }));
      await queryClient.invalidateQueries({ queryKey: ["contacts-tenants"] });
      toast({ title: "Cliente cadastrado como inquilino" });
    } catch (err: any) {
      console.error("[NovoContrato] Erro ao usar cliente do CRM:", err);
      toast({ title: "Erro ao cadastrar inquilino", description: err?.message, variant: "destructive" });
    } finally {
      setCrmUsingTenant(false);
    }
  };

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
      return format(addYears(parseDateOnly(formData.start_date)!, 1), "yyyy-MM-dd");
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

  /**
   * Telefone do contato de cobrança escolhido: o WhatsApp deixa de ser digitado
   * à mão e passa a vir do próprio contato, o mesmo objeto usado na aba Cobrança.
   */
  const { data: billingWhatsAppContact } = useQuery({
    queryKey: ["billing-contact-phone", billingContact.contact_id],
    enabled: !!billingContact.contact_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, phone, whatsapp")
        .eq("id", billingContact.contact_id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!billingWhatsAppContact) return;
    const raw = billingWhatsAppContact.whatsapp || billingWhatsAppContact.phone || "";
    setBillingContact((p) => ({ ...p, whatsapp: formatWhatsAppDisplay(raw) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingWhatsAppContact?.id, billingWhatsAppContact?.whatsapp, billingWhatsAppContact?.phone]);

  // Auto-populate billing contact when tenant changes (only if fields are still empty)
  useEffect(() => {
    if (!selectedTenant) return;
    setBillingContact((prev) => ({
      name: prev.name || selectedTenant.name || "",
      email: prev.email || selectedTenant.email || "",
      whatsapp:
        prev.whatsapp || formatWhatsAppDisplay(selectedTenant.whatsapp || selectedTenant.phone || ""),
      contact_id: prev.contact_id || selectedTenant.id,
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

  const specialConditionErrors = validateSpecialConditions({
    rentAmount: Number(formData.rent_amount) || 0,
    grace: formData.rent_grace,
    deductions: formData.rent_deductions,
    withholding: formData.rent_withholding,
  });

  const primaryRef: LeaseUnitRef = { unit_id: effectiveUnitId, unit_subdivision_id: formData.unit_subdivision_id || null };
  const leaseSharesError = validateExtraUnits(primaryRef, extraUnits);
  const leaseUnitRefs = leaseUnitRefsFor(primaryRef, extraUnits);

  // W2: soma dos preços anunciados dos imóveis/frações do contrato
  const priceUnitIds = Array.from(new Set(leaseUnitRefs.map((r) => r.unit_id).filter(Boolean))).sort();
  const priceSubIds = Array.from(
    new Set(leaseUnitRefs.map((r) => r.unit_subdivision_id).filter(Boolean) as string[])
  ).sort();
  const { data: listedPrices } = useQuery({
    queryKey: ["lease-listed-prices", priceUnitIds.join(","), priceSubIds.join(",")],
    enabled: leaseUnitRefs.length > 1,
    queryFn: async () => {
      const [{ data: us }, { data: subs }] = await Promise.all([
        supabase.from("units").select("id, unit_number, rent_price").in("id", priceUnitIds),
        priceSubIds.length
          ? supabase.from("unit_subdivisions").select("id, label, rent_price").in("id", priceSubIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      return { units: (us as any[]) || [], subs: (subs as any[]) || [] };
    },
  });
  const listedPriceSuggestion = useMemo(() => {
    if (!listedPrices || leaseUnitRefs.length < 2) return null;
    const parts = leaseUnitRefs.map((r, i) => {
      const u = listedPrices.units.find((x) => x.id === r.unit_id);
      const sub = r.unit_subdivision_id ? listedPrices.subs.find((x) => x.id === r.unit_subdivision_id) : null;
      const price = Number(sub ? sub.rent_price : u?.rent_price) || 0;
      const name = sub ? `${u?.unit_number || "Imóvel"} — ${sub.label}` : u?.unit_number || "Imóvel";
      return { label: i === 0 ? `principal ${formatCurrencyBRL(price)}` : `${name} ${formatCurrencyBRL(price)}`, price };
    });
    const total = Math.round(parts.reduce((sum, p) => sum + p.price, 0) * 100) / 100;
    if (total <= 0) return null;
    return { total, text: parts.map((p) => p.label).join(" + ") };
  }, [listedPrices, leaseUnitRefs]);
  const purposeUnitIds = Array.from(new Set(leaseUnitRefs.map((r) => r.unit_id).filter(Boolean))).sort();
  const { data: purposeUnitTypes = [] } = useQuery({
    queryKey: ["lease-purpose-unit-types", purposeUnitIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("units").select("property_type").in("id", purposeUnitIds);
      return (data || []).map((u: any) => u.property_type as string | null);
    },
    enabled: purposeUnitIds.length > 0,
  });
  const suggestedPurpose = defaultLeasePurpose(purposeUnitTypes);
  useEffect(() => {
    if (!purposeTouched) setLeasePurpose(suggestedPurpose);
  }, [suggestedPurpose, purposeTouched]);

  const savePurpose = async (leaseId: string) => {
    const { data: row } = await supabase.from("leases").select("metadata").eq("id", leaseId).maybeSingle();
    const metadata = { ...(((row as any)?.metadata as Record<string, unknown>) || {}), purpose: leasePurpose };
    const { error } = await supabase.from("leases").update({ metadata } as any).eq("id", leaseId);
    if (error) console.error("[NovoContrato] Falha ao gravar a finalidade:", error);
  };

  /**
   * Grava os imóveis do contrato (RPC set_lease_units), ocupa os atuais e libera os removidos.
   * Retorna a mensagem de erro da RPC, ou null em caso de sucesso.
   */
  const saveLeaseUnits = async (leaseId: string): Promise<string | null> => {
    const withShares = extraUnits.enabled && extraUnits.shareEnabled && leaseUnitRefs.length > 1;
    try {
      await setLeaseUnits.mutateAsync({
        leaseId,
        units: leaseUnitRefs.map((ref, i) => ({
          unit_id: ref.unit_id,
          unit_subdivision_id: ref.unit_subdivision_id,
          is_primary: i === 0,
          share_percent: withShares ? Number(extraUnits.shares[leaseUnitRefKey(ref)]) || 0 : null,
        })),
      });
    } catch (e) {
      return e instanceof Error ? e.message : "Erro ao salvar os imóveis do contrato";
    }
    if (formData.tenant_contact_id) {
      await occupyLeaseUnits({
        leaseId,
        tenantContactId: formData.tenant_contact_id,
        startDate: formData.start_date,
        refs: leaseUnitRefs,
      });
    }
    const currentKeys = new Set(leaseUnitRefs.map(leaseUnitRefKey));
    const removed = (initialLeaseUnitRefsRef.current || []).filter((r) => !currentKeys.has(leaseUnitRefKey(r)));
    if (removed.length) await releaseLeaseUnits(leaseId, removed);
    initialLeaseUnitRefsRef.current = leaseUnitRefs;
    return null;
  };

  const LIVE_LEASE_ERR = "já tem contrato ativo";
  const handleLiveLeaseError = (msg: string | null | undefined) => {
    if (!msg || !msg.includes(LIVE_LEASE_ERR)) return false;
    toast({
      title: "Imóvel ou fração já tem contrato ativo",
      description: "Escolha uma fração livre ou encerre o contrato atual antes.",
      variant: "destructive",
    });
    setStep("unit");
    return true;
  };

  const canProceed = () => {
    switch (step) {
      case "unit":
        return !!effectiveUnitId && !leaseSharesError && !primarySelectionBusy;
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
          endDateValid &&
          specialConditionErrors.length === 0
        );
      }
      case "guarantee":
        if (!formData.guarantee_type) return false;
        if (formData.guarantee_type === "fiador") {
          const hasBasicInfo = !!(guarantorData.nome && guarantorData.cpf) && !guarantorCpfError;
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
    if (formData.guarantee_type === "fiador" && guarantorCpfError) {
      toast({ title: guarantorCpfError, variant: "destructive" });
      setStep("guarantee");
      return;
    }
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
    if (leaseSharesError) {
      toast({ title: "Revise o rateio dos imóveis", description: leaseSharesError, variant: "destructive" });
      setStep("unit");
      return;
    }
    if (isEditMode && !leaseUnitsLoaded) {
      toast({ title: "Aguarde o carregamento dos imóveis do contrato", variant: "destructive" });
      return;
    }
    if (specialConditionErrors.length > 0) {
      toast({
        title: "Revise as condições especiais",
        description: specialConditionErrors[0],
        variant: "destructive",
      });
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
        guarantee_type: (formData.guarantee_type || "none") as GuaranteeType,
        guarantor_data: finalGuarantorData,
        payment_info: finalPaymentInfo,
        is_indefinite_term: formData.is_indefinite_term,
        adjustment_periodicity_months: formData.adjustment_periodicity_months,
        fire_insurance: formData.fire_insurance.enabled ? formData.fire_insurance : null,
        iptu_charge: formData.iptu_charge.enabled ? formData.iptu_charge : null,
        additional_obligations: (formData.additional_obligations || []).filter((o) => o.enabled),
        ...specialConditionsForSave(formData),
        billing_automation: (() => {
          // Fonte única de verdade: `email_to` alimenta os avisos automáticos e
          // `billing_contact.contact_id` pré-seleciona o bloco manual de WhatsApp.
          const contact = {
            name: billingContact.name,
            email: billingContact.email,
            whatsapp: billingWhatsAppStored(),
            contact_id: billingContact.contact_id || null,
          };
          const emailTo = billingContact.email.trim() || null;
          return isEditMode && editLease
            ? {
                ...(editLease.billing_automation || {}),
                email_to: emailTo,
                billing_contact: contact,
              }
            : {
                enabled: false,
                email_to: emailTo,
                steps: { "-3": true, "0": true, "1": false, "3": true },
                billing_contact: contact,
              };
        })() as any,
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

        const unitsError = await saveLeaseUnits(editLease.id);
        if (unitsError) {
          if (handleLiveLeaseError(unitsError)) return;
          toast({ title: "Erro nos imóveis do contrato", description: unitsError, variant: "destructive" });
          setStep("unit");
          return;
        }

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
              startDate: formData.start_date || null,
              rentGrace: formData.rent_grace?.enabled ? formData.rent_grace : null,
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
        await savePurpose(editLease.id);
      } else {
        const result = await createLease.mutateAsync(leaseData);
        resultId = (result as any).id || (result as any).lease?.id || "";
        if (resultId) await savePurpose(resultId);

        if (resultId && dealIdParam && crmDeal && !crmDeal.contact_id && formData.tenant_contact_id) {
          const { error: dealErr } = await supabase
            .from("deals")
            .update({ contact_id: formData.tenant_contact_id })
            .eq("id", dealIdParam);
          if (dealErr) console.error("[NovoContrato] Falha ao vincular contato ao negócio:", dealErr);
        }

        if (resultId && leaseUnitRefs.length > 1) {
          const unitsError = await saveLeaseUnits(resultId);
          if (unitsError) {
            // O contrato já existe: segue em modo edição, na etapa Imóvel, para corrigir
            if (!handleLiveLeaseError(unitsError)) toast({
              title: "Contrato criado, mas os imóveis adicionais não foram salvos",
              description: unitsError,
              variant: "destructive",
            });
            sessionStorage.removeItem(DRAFT_KEY);
            navigate(`/gestao/contratos/novo?edit=${resultId}&step=unit`, { replace: true });
            return;
          }
        }

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
              startDate: formData.start_date || null,
              rentGrace: formData.rent_grace?.enabled ? formData.rent_grace : null,
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

      const specialChanged =
        isEditMode &&
        !shouldOfferProjection &&
        initialSpecialRef.current !== null &&
        initialSpecialRef.current !== JSON.stringify(specialConditionsForSave(formData));

      // Lançamentos financeiros só acontecem após confirmação explícita do usuário.
      if (resultId && (!isEditMode || shouldOfferProjection || specialChanged)) {
        setPostProjectionNavId(resultId);
        setProjectionLease({
          id: resultId,
          unit_id: effectiveUnitId,
          tenant_contact_id: formData.tenant_contact_id,
          owner_contact_id: ownerContactId ?? null,
          property_id: selectedUnitInfo?.property_id ?? null,
          rent_amount: Number(formData.rent_amount) || 0,
          due_day: Number(formData.due_day) || 10,
          start_date: formData.start_date,
          end_date: formData.is_indefinite_term ? null : formData.end_date || null,
          next_adjustment_date: formData.next_adjustment_date || null,
          is_indefinite_term: formData.is_indefinite_term,
          fire_insurance: formData.fire_insurance?.enabled ? formData.fire_insurance : null,
          iptu_charge: formData.iptu_charge?.enabled ? formData.iptu_charge : null,
          additional_obligations: (formData.additional_obligations || []).filter((o) => o.enabled),
          admin_fee_percentage: Number(formData.admin_fee_percentage) || 0,
          ...specialConditionsForSave(formData),
          unit: selectedUnitInfo
            ? { unit_number: selectedUnitInfo.unit_number, address: selectedUnitInfo.address }
            : null,
          tenant: {
            name:
              (tenants || []).find((t: any) => t.id === formData.tenant_contact_id)?.name || null,
          },
        } as LeaseForProjection);
        if (specialChanged) {
          // Edição comum: avisa e só abre a revisão se o usuário pedir
          setReviewPromptOpen(true);
        } else {
          setProjectionOpen(true);
        }
        return;
      }

      if (resultId) {
        navigate(`/gestao/contratos?id=${resultId}`);
      } else {
        navigate("/gestao/contratos");
      }
    } catch (error) {
      if (handleLiveLeaseError(error instanceof Error ? error.message : (error as any)?.message)) return;
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
          <h2 className="text-xl font-semibold truncate flex items-center gap-2">
            {isPendingSetup ? "Finalizar Contrato" : isEditMode ? "Editar Contrato" : "Novo Contrato"}
            {dealIdParam && (
              <span className="text-[10px] font-medium rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                Vindo do CRM
              </span>
            )}
          </h2>
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
          <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
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

              {isEditMode || unitIdParam ? (
                <div className="p-3 rounded-lg border text-sm">
                  <span className="text-muted-foreground">Imóvel principal: </span>
                  <span className="font-medium">{unitName || "—"}</span>
                </div>
              ) : (
              <>
              <div className="space-y-2">
                <Label htmlFor="novocontrato-buscar-imovel">Buscar Imóvel</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="novocontrato-buscar-imovel"
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
              </>
              )}

              {effectiveUnitId && (
                <div className="space-y-1.5">
                  <Label htmlFor="novocontrato-finalidade-da-locacao" className="text-xs sm:text-sm">Finalidade da locação</Label>
                  <Select
                    value={leasePurpose}
                    onValueChange={(v) => {
                      setLeasePurpose(v as LeasePurpose);
                      setPurposeTouched(true);
                    }}
                  >
                    <SelectTrigger id="novocontrato-finalidade-da-locacao" className="w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residencial">Residencial</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                  {!purposeTouched && (
                    <p className="text-[10px] text-muted-foreground">Sugerida pelo tipo dos imóveis do contrato.</p>
                  )}
                </div>
              )}

              {effectiveUnitId && (
                showSubdivisionSelect ? (
                  <div className="space-y-2">
                    <Label htmlFor="wizard-fraction">Fração do imóvel principal</Label>
                    <Select
                      value={primarySelectionBusy ? "" : formData.unit_subdivision_id ?? "none"}
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
                      <SelectTrigger id="wizard-fraction">
                        <SelectValue placeholder="Imóvel inteiro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled={wholeOptionBusy}>
                          Imóvel inteiro (sem fração){wholeOptionBusy ? " (há frações alugadas)" : ""}
                        </SelectItem>
                        {subdivisions.map((s) => (
                          <SelectItem key={s.id} value={s.id} disabled={busySubdivisionIds.has(s.id) || wholeUnitBusy}>
                            {s.label}
                            {s.area != null ? ` — ${s.area}m²` : ""}
                            {busySubdivisionIds.has(s.id) ? " (alugada)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {primarySelectionBusy && (
                      <p className="text-xs text-destructive" role="alert">
                        Esta fração/imóvel já tem contrato ativo. Escolha uma fração livre ou encerre o contrato atual.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Opcional. Selecione a fração quando o contrato for de apenas uma parte do
                      imóvel — o valor do aluguel é preenchido automaticamente e pode ser ajustado.
                    </p>
                  </div>
                ) : primarySelectionBusy ? (
                  <p className="text-xs text-destructive" role="alert">
                    Esta fração/imóvel já tem contrato ativo. Escolha uma fração livre ou encerre o contrato atual.
                  </p>
                ) : null
              )}

              {effectiveUnitId && (
                <LeaseExtraUnitsSection
                  primary={primaryRef}
                  primaryLabel={unitName || "Imóvel principal"}
                  value={extraUnits}
                  onChange={setExtraUnits}
                  brokerId={effectiveBrokerId || user.id}
                  editLeaseId={editLeaseId}
                />
              )}
            </div>
          )}

          {/* Tenant */}
          {step === "tenant" && (
            <div className="space-y-4">
              {crmDeal?.lead && (!crmContact || formData.tenant_contact_id !== crmContact.id) && (
                <Card className="bg-card">
                  <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Cliente do negócio no CRM: </span>
                      <span className="font-medium">
                        {[crmDeal.lead.name, crmDeal.lead.email, crmDeal.lead.phone].filter(Boolean).join(" · ")}
                      </span>
                    </p>
                    <Button size="sm" onClick={useCrmClientAsTenant} disabled={crmUsingTenant}>
                      Usar como inquilino
                    </Button>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label htmlFor="wizard-tenant-search">Buscar Inquilino</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wizard-tenant-search"
                    placeholder="Nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label id="wizard-tenant-list-label">Selecionar Inquilino *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setCreateTenantOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo inquilino
                  </Button>
                </div>
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
          {step === "financial" && specialConditionErrors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Revise as condições especiais</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-0.5 text-xs mt-1">
                  {specialConditionErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {step === "financial" && listedPriceSuggestion && Math.abs(listedPriceSuggestion.total - (formData.rent_amount || 0)) > 0.004 && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                Soma dos preços anunciados: <span className="font-semibold">{formatCurrencyBRL(listedPriceSuggestion.total)}</span>{" "}
                <span className="text-muted-foreground">({listedPriceSuggestion.text})</span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormData((prev) => ({ ...prev, rent_amount: listedPriceSuggestion.total }))}
              >
                Usar soma
              </Button>
            </div>
          )}
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
            />
          )}

          {/* Guarantee */}
          {step === "guarantee" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label id="novocontrato-tipo-de-garantia" className="text-base font-semibold">Tipo de Garantia *</Label>
                <RadioGroup aria-labelledby="novocontrato-tipo-de-garantia"
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
                      <Label htmlFor="novocontrato-nome-completo" className="text-xs sm:text-sm">Nome Completo *</Label>
                      <Input id="novocontrato-nome-completo"
                        value={guarantorData.nome}
                        onChange={(e) =>
                          setGuarantorData({ ...guarantorData, nome: e.target.value })
                        }
                        placeholder="Nome do fiador"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="novocontrato-cpf" className="text-xs sm:text-sm">CPF *</Label>
                      <Input id="novocontrato-cpf"
                        value={guarantorData.cpf}
                        onChange={(e) => setGuarantorData({ ...guarantorData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        aria-invalid={!!guarantorCpfError}
                      />
                      {guarantorCpfError && onlyDigits(guarantorData.cpf).length >= 11 && (
                        <p className="text-xs text-destructive">{guarantorCpfError}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="novocontrato-rg" className="text-xs sm:text-sm">RG</Label>
                      <Input id="novocontrato-rg"
                        value={guarantorData.rg || ""}
                        onChange={(e) => setGuarantorData({ ...guarantorData, rg: e.target.value })}
                        placeholder="RG"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="novocontrato-profissao" className="text-xs sm:text-sm">Profissão</Label>
                      <Input id="novocontrato-profissao"
                        value={guarantorData.profissao || ""}
                        onChange={(e) =>
                          setGuarantorData({ ...guarantorData, profissao: e.target.value })
                        }
                        placeholder="Profissão"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="novocontrato-estado-civil" className="text-xs sm:text-sm">Estado Civil *</Label>
                      <Select
                        value={guarantorData.estadoCivil}
                        onValueChange={(v) =>
                          setGuarantorData({ ...guarantorData, estadoCivil: v })
                        }
                      >
                        <SelectTrigger id="novocontrato-estado-civil">
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
                        <Label htmlFor="novocontrato-cep" className="text-xs sm:text-sm">CEP</Label>
                        <div className="relative">
                          <Input id="novocontrato-cep"
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
                        <Label htmlFor="novocontrato-endereco" className="text-xs sm:text-sm">Endereço</Label>
                        <Input id="novocontrato-endereco"
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
                        <Label htmlFor="novocontrato-cidade" className="text-xs sm:text-sm">Cidade</Label>
                        <Input id="novocontrato-cidade"
                          value={guarantorData.cidade}
                          onChange={(e) =>
                            setGuarantorData({ ...guarantorData, cidade: e.target.value })
                          }
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="novocontrato-uf" className="text-xs sm:text-sm">UF</Label>
                        <Input id="novocontrato-uf"
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
                          <Label htmlFor="novocontrato-nome-do-conjuge">Nome do Cônjuge *</Label>
                          <Input id="novocontrato-nome-do-conjuge"
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
                          <Label htmlFor="novocontrato-cpf-do-conjuge">CPF do Cônjuge *</Label>
                          <Input id="novocontrato-cpf-do-conjuge"
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
                          <Label htmlFor="novocontrato-rg-do-conjuge">RG do Cônjuge</Label>
                          <Input id="novocontrato-rg-do-conjuge"
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
                        <Label htmlFor="novocontrato-endereco-do-imovel">Endereço do Imóvel</Label>
                        <Input id="novocontrato-endereco-do-imovel"
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
                        <Label htmlFor="novocontrato-matricula">Matrícula</Label>
                        <Input id="novocontrato-matricula"
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
                        <Label htmlFor="novocontrato-cartorio">Cartório</Label>
                        <Input id="novocontrato-cartorio"
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
                <Label htmlFor="novocontrato-tipo-de-pagamento">Tipo de Pagamento</Label>
                <Select
                  value={paymentInfo.tipo}
                  onValueChange={(v) =>
                    setPaymentInfo({ ...paymentInfo, tipo: v as "pix" | "banco" | "boleto" })
                  }
                >
                  <SelectTrigger id="novocontrato-tipo-de-pagamento">
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
                  <Label htmlFor="novocontrato-chave-pix">Chave PIX</Label>
                  <Input id="novocontrato-chave-pix"
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
                      <Label htmlFor="novocontrato-banco">Banco</Label>
                      <Input id="novocontrato-banco"
                        value={paymentInfo.banco || ""}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, banco: e.target.value })}
                        placeholder="Nome do banco"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="novocontrato-agencia">Agência</Label>
                      <Input id="novocontrato-agencia"
                        value={paymentInfo.agencia || ""}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, agencia: e.target.value })}
                        placeholder="0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="novocontrato-conta">Conta</Label>
                      <Input id="novocontrato-conta"
                        value={paymentInfo.conta || ""}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, conta: e.target.value })}
                        placeholder="00000-0"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="novocontrato-titular">Titular</Label>
                      <Input id="novocontrato-titular"
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
                            <span className="text-amber-700 dark:text-amber-400 text-xs">
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
                        <Label htmlFor="novocontrato-multa-por-atraso" className="text-xs">Multa por atraso (%)</Label>
                        <Input id="novocontrato-multa-por-atraso"
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
                        <Label htmlFor="novocontrato-juros-ao-mes" className="text-xs">Juros ao mês (%)</Label>
                        <Input id="novocontrato-juros-ao-mes"
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
                        <Label htmlFor="novocontrato-desconto-r" className="text-xs">Desconto (R$)</Label>
                        <Input id="novocontrato-desconto-r"
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
                        <Label htmlFor="novocontrato-dias-antes-do-vencimento-para-desconto" className="text-xs">Dias antes do vencimento para desconto</Label>
                        <Input id="novocontrato-dias-antes-do-vencimento-para-desconto"
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
                <p className="text-sm font-medium text-primary mb-1">Contato para cobrança</p>
                <p className="text-xs text-muted-foreground [text-wrap:pretty]">
                  Defina para onde vão os avisos deste contrato. O <strong>e-mail</strong> é usado
                  pelos avisos automáticos, que você liga depois na aba <strong>Cobrança</strong>.
                  O <strong>WhatsApp</strong> é sempre manual: o sistema monta a mensagem e você
                  envia.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="novocontrato-nome-do-contato">Nome do Contato *</Label>
                <Input id="novocontrato-nome-do-contato"
                  value={billingContact.name}
                  onChange={(e) => setBillingContact((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do responsável pelo pagamento"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-preenchido com o nome do inquilino selecionado.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="novocontrato-e-mail-para-cobranca">E-mail para Cobrança</Label>
                <Input id="novocontrato-e-mail-para-cobranca"
                  type="email"
                  value={billingContact.email}
                  onChange={(e) => setBillingContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Já entra preenchido na aba Cobrança como destinatário dos avisos automáticos.
                </p>
              </div>

              <div className="space-y-2">
                <Label id="novocontrato-contato-de-whatsapp">Contato de WhatsApp</Label>
                <ContactSelector aria-labelledby="novocontrato-contato-de-whatsapp"
                  value={billingContact.contact_id || null}
                  onChange={(id) => setBillingContact((p) => ({ ...p, contact_id: id || "" }))}
                  placeholder="Selecione o contato para mensagens de cobrança"
                />
                <p className="text-xs text-muted-foreground">
                  É o contato pré-selecionado no envio manual de WhatsApp, na aba Cobrança.
                </p>
              </div>

            </div>
          )}

          {/* Compliance */}

          {step === "compliance" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="novocontrato-cib">CIB (Cadastro Imobiliário Brasileiro)</Label>
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
                  id="novocontrato-cib"
                  value={formData.cib}
                  onChange={(e) => setFormData({ ...formData, cib: e.target.value })}
                  placeholder="Ex: 0000.0000.0000.0000-00"
                />
                <p className="text-xs text-muted-foreground">
                  {unitCib
                    ? "Valor cadastrado no imóvel. Alterações aqui atualizam o cadastro do imóvel."
                    : "O CIB é um atributo do imóvel: ao salvar, ele também será gravado no cadastro da unidade."}
                </p>
              </div>


              <div className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="dimob" className="text-sm font-medium cursor-pointer">
                    Declarar na DIMOB
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marque para incluir os aluguéis deste contrato na declaração DIMOB
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
                <Label htmlFor="novocontrato-observacoes">Observações</Label>
                <Textarea id="novocontrato-observacoes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotações sobre o contrato..."
                  rows={3}
                />
              </div>

              <div className="p-3 border rounded-lg bg-muted/30 space-y-2 text-sm">
                <p className="font-medium">Resumo do Contrato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-xs sm:text-sm">
                  <span>{leaseUnitRefs.length > 1 ? "Imóveis:" : "Imóvel:"}</span>
                  <span className="font-medium text-foreground">
                    {leaseUnitRefs.map((ref, i) => {
                      const key = leaseUnitRefKey(ref);
                      const extra = extraUnits.units.find((u) => u.id === ref.unit_id);
                      const base = i === 0 ? unitName || "Imóvel principal" : extra ? unitLabel(extra) : ref.unit_id;
                      const label =
                        i > 0 && ref.unit_subdivision_id
                          ? `${base} — ${extraUnits.fractionLabels?.[ref.unit_subdivision_id] || "Fração"}`
                          : base;
                      const share =
                        extraUnits.enabled && extraUnits.shareEnabled && leaseUnitRefs.length > 1
                          ? ` · ${(Number(extraUnits.shares[key]) || 0).toLocaleString("pt-BR")}%`
                          : "";
                      return (
                        <span key={key} className="block">
                          {label}
                          {i === 0 && leaseUnitRefs.length > 1 ? " (principal)" : ""}
                          {share}
                        </span>
                      );
                    })}
                  </span>
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
                  <span>Vigência:</span>
                  <span className="font-medium text-foreground">
                    {formatDateOnly(formData.start_date, "dd/MM/yyyy")}
                    {formData.is_indefinite_term || !formData.end_date
                      ? " — prazo indeterminado"
                      : ` a ${formatDateOnly(formData.end_date, "dd/MM/yyyy")}`}
                  </span>
                  <span>Finalidade:</span>
                  <span className="font-medium text-foreground">{leasePurpose === "comercial" ? "Comercial" : "Residencial"}</span>
                  <span>Taxa de administração:</span>
                  <span className="font-medium text-foreground">
                    {(formData.admin_fee_percentage || 0).toLocaleString("pt-BR")}%
                  </span>
                  {formData.rent_grace?.enabled && (
                    <>
                      <span>Carência:</span>
                      <span className="font-medium text-foreground">
                        {graceSummary(formData.rent_grace, formData.start_date).label || "configurada"}
                      </span>
                    </>
                  )}
                  {(formData.rent_deductions || []).some((d) => d.enabled && isValidRentDeduction(d)) && (
                    <>
                      <span>Abatimentos:</span>
                      <span className="font-medium text-foreground">
                        {(formData.rent_deductions || [])
                          .filter((d) => d.enabled && isValidRentDeduction(d))
                          .map((d) => {
                            const n =
                              d.recurrence === "installments"
                                ? ` × ${d.installments || 1}`
                                : d.recurrence === "monthly"
                                  ? " por mês"
                                  : "";
                            return `${d.label}: ${formatCurrencyBRL(Number(d.amount) || 0)}${n}`;
                          })
                          .join("; ")}
                      </span>
                    </>
                  )}
                  {(formData as any).rent_withholding?.enabled && (
                    <>
                      <span>IRRF:</span>
                      <span className="font-medium text-foreground">
                        {(() => {
                          const w = (formData as any).rent_withholding;
                          if (w.mode === "percent") return `Retido pelo inquilino: ${(Number(w.percent) || 0).toLocaleString("pt-BR")}%`;
                          if (w.mode === "fixed") return `Retido pelo inquilino: ${formatCurrencyBRL(Number(w.fixed_amount) || 0)}`;
                          return "Retido pelo inquilino pela tabela progressiva";
                        })()}
                      </span>
                    </>
                  )}
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
      <div className="sticky bottom-0 -mx-4 lg:-mx-8 mt-4 bg-card border-t py-3 px-4 lg:px-8 flex justify-between gap-2">
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
      <CreateContactDialog
        open={createTenantOpen}
        onOpenChange={setCreateTenantOpen}
        defaultCategory={"Inquilino" as any}
        onSuccess={async (c) => {
          await queryClient.invalidateQueries({ queryKey: ["contacts-tenants"] });
          if (c?.id) setFormData((prev) => ({ ...prev, tenant_contact_id: c.id }));
        }}
      />
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
      <ReviewDialog
        open={reviewPromptOpen}
        onOpenChange={(o) => {
          if (o) return;
          setReviewPromptOpen(false);
          const id = postProjectionNavId;
          setProjectionLease(null);
          navigate(id ? `/gestao/contratos?id=${id}` : "/gestao/contratos");
        }}
      >
        <ReviewDialogContent>
          <ReviewDialogHeader>
            <ReviewDialogTitle>Condições especiais alteradas</ReviewDialogTitle>
            <ReviewDialogDescription>
              Os lançamentos já gerados deste contrato não mudam sozinhos. Revise os lançamentos para aplicar a
              carência, os abatimentos e o IRRF novos.
            </ReviewDialogDescription>
          </ReviewDialogHeader>
          <ReviewDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReviewPromptOpen(false);
                const id = postProjectionNavId;
                setProjectionLease(null);
                navigate(id ? `/gestao/contratos?id=${id}` : "/gestao/contratos");
              }}
            >
              Agora não
            </Button>
            <Button
              onClick={() => {
                setReviewPromptOpen(false);
                setProjectionOpen(true);
              }}
            >
              Revisar lançamentos
            </Button>
          </ReviewDialogFooter>
        </ReviewDialogContent>
      </ReviewDialog>
    </AppLayout>
  );
}
