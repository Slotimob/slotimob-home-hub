import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Json } from "@/integrations/supabase/types";
import { useDeleteLeaseProjections } from "@/hooks/useLeaseFinancialProjection";
import { format } from "date-fns";
import { formatPhoneForWhatsApp } from "@/lib/utils";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";

export interface GuarantorData {
  nome: string;
  cpf: string;
  rg?: string;
  profissao?: string;
  estadoCivil?: string;
  cep?: string;
  endereco: string;
  cidade: string;
  estado: string;
  conjuge?: {
    nome: string;
    cpf: string;
    rg?: string;
  };
  imovelGarantia?: {
    endereco: string;
    matricula: string;
    cartorio?: string;
    valor?: string;
  };
}

export interface PaymentInfo {
  tipo: "pix" | "banco" | "boleto";
  chavePix?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  titular?: string;
  // emissão do boleto: própria (manual, fora do sistema) ou via Asaas
  emissao_boleto?: "propria" | "asaas";
  // campos Asaas — usados quando tipo = "boleto"
  fine_value?: number;
  interest_value?: number;
  discount_value?: number;
  discount_type?: "FIXED" | "PERCENTAGE";
  discount_due_date_limit_days?: number;
  send_email?: boolean;
  send_whatsapp?: boolean;
}

export interface BillingAutomation {
  reminder_5_days: boolean;
  reminder_due_day: boolean;
  reminder_3_days_late: boolean;
  send_method: "whatsapp" | "email" | "both";
  // canais de automação (opcionais para retrocompatibilidade)
  email_enabled?: boolean;
  email_destination?: string;
  whatsapp_enabled?: boolean;
  billing_contact?: {
    name: string;
    email: string;
    whatsapp: string; // stored as digits only with +55 prefix: ex "+5511999999999"
  };
  // sem whatsapp_destination: número vem de lease.tenant?.whatsapp || lease.tenant?.phone
  // outros campos existentes no JSONB
  legal_notification_7_days?: boolean;
}

/**
 * Responsável pelo encargo do contrato.
 * Mesma taxonomia da Matriz de Responsabilidades (`ResponsibleRole` em useAssetHealth):
 * - tenant: inquilino paga (soma à cobrança do inquilino)
 * - owner: proprietário paga (valor é repassado a ele, soma ao repasse líquido)
 * - agency: a imobiliária absorve o custo (não soma nem subtrai de ninguém)
 */
export type LeaseChargeResponsible = "tenant" | "owner" | "agency";

/**
 * Vínculo do responsável com um registro real.
 * - `charge_to` continua sendo o tipo (tenant/owner/agency)
 * - `responsible_contact_id` é a referência real resolvida no momento da edição:
 *   inquilino do contrato, proprietário do imóvel ou a imobiliária escolhida.
 * - `agency_contact_id` guarda especificamente a imobiliária selecionada
 *   (categoria "Imobiliária" em /contacts), preservada mesmo se o usuário
 *   alternar o tipo e voltar para "agency".
 */
export interface LeaseChargeResponsibleLink {
  responsible_contact_id?: string | null;
  agency_contact_id?: string | null;
}

/** Seguro incêndio parametrizado no contrato (leases.fire_insurance) */
export interface FireInsuranceConfig extends LeaseChargeResponsibleLink {
  enabled: boolean;
  total_amount: number;
  installments: number;
  installment_amount: number;
  first_due_date: string | null;
  charge_to: LeaseChargeResponsible;
}

/** IPTU parcelado parametrizado no contrato (leases.iptu_charge) */
export interface IptuChargeConfig extends LeaseChargeResponsibleLink {
  enabled: boolean;
  annual_amount: number;
  installments: number;
  installment_amount: number;
  first_due_date: string | null;
  charge_to: LeaseChargeResponsible;
  /** 'unit' quando o valor veio do cadastro do imóvel, 'manual' quando editado */
  source: "unit" | "manual";
}

/**
 * Tipos de encargo adicionais configuráveis no contrato.
 * Espelha a taxonomia da Matriz de Responsabilidades (ObligationType),
 * sem `rent` (é o próprio aluguel), `insurance` (fire_insurance) e `iptu` (iptu_charge).
 *
 * Aberto a `string` para aceitar também os tipos customizados do corretor
 * (`custom_<uuid>`, mesma convenção usada em `units.obligations_config`).
 * Valores canônicos do sistema: "condominium" | "energy" | "water" | "gas" | "other".
 */
export type AdditionalObligationType = string;

/**
 * Encargo adicional parametrizado no contrato (leases.additional_obligations).
 * Mesmo shape de FireInsuranceConfig/IptuChargeConfig, com valor mensal.
 */
export interface ObligationChargeConfig extends LeaseChargeResponsibleLink {
  type: AdditionalObligationType;
  enabled: boolean;
  /** Valor mensal do encargo */
  installment_amount: number;
  first_due_date: string | null;
  charge_to: LeaseChargeResponsible;
  /** Descrição livre — usada principalmente no tipo "other" */
  label?: string | null;
}




export interface BillingLog {
  type: "reminder_5_days" | "reminder_due_day" | "reminder_3_days_late" | "manual";
  sent_at: string;
  method: "whatsapp" | "email" | "phone" | "in_person" | "other";
  success: boolean;
  error?: string;
  sent_by?: string; // Name of the person who sent
  sent_to?: string; // Destination (email or phone) used
  notes?: string;   // Optional notes about the contact
}

export interface Lease {
  id: string;
  broker_id: string;
  unit_id: string;
  unit_subdivision_id?: string | null;
  tenant_contact_id: string;
  owner_contact_id: string | null;
  rent_amount: number;
  admin_fee_percentage: number;
  due_day: number;
  deposit_amount: number;
  start_date: string;
  end_date: string | null;
  status: "active" | "terminated" | "expired" | "pending";
  cib: string | null;
  is_dimob_deductible: boolean;
  billing_automation: BillingAutomation;
  billing_logs: BillingLog[];
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // CRITICAL: Adjustment fields are required (nullable) to ensure proper propagation
  next_adjustment_date: string | null;
  adjustment_index: string | null;
  // Signature fields
  signature_status?: "pending" | "signed";
  signed_contract_path?: string | null;
  termination_date?: string | null;
  termination_reason?: string | null;
  guarantee_type?: "fiador" | "caucao" | "seguro_fianca" | "none";
  guarantor_data?: GuarantorData | null;
  payment_info?: PaymentInfo | null;
  is_indefinite_term?: boolean;
  adjustment_periodicity_months?: number;
  fire_insurance?: FireInsuranceConfig | null;
  iptu_charge?: IptuChargeConfig | null;
  additional_obligations?: ObligationChargeConfig[] | null;
  property_id?: string | null;
  // Joined data
  tenant?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
  owner?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  unit?: {
    id: string;
    unit_number: string;
    address: string | null;
    property?: {
      name: string;
    };
  };
}

export interface CreateLeaseData {
  unit_id: string;
  unit_subdivision_id?: string | null;
  tenant_contact_id: string;
  owner_contact_id?: string;
  rent_amount: number;
  admin_fee_percentage?: number;
  due_day: number;
  deposit_amount?: number;
  start_date: string;
  end_date?: string | null;
  cib?: string;
  is_dimob_deductible?: boolean;
  billing_automation?: BillingAutomation;
  notes?: string;
  adjustment_index?: string;
  next_adjustment_date?: string;
  // Optional: property_id for linking financial transactions
  property_id?: string;
  // Flag to skip financial projection (useful for imports)
  skipFinancialProjection?: boolean;
  guarantee_type?: "fiador" | "caucao" | "seguro_fianca" | "none";
  guarantor_data?: GuarantorData | null;
  payment_info?: PaymentInfo | null;
  is_indefinite_term?: boolean;
  adjustment_periodicity_months?: number;
  fire_insurance?: FireInsuranceConfig | null;
  iptu_charge?: IptuChargeConfig | null;
  additional_obligations?: ObligationChargeConfig[] | null;
}

export interface CreateLeaseResult {
  lease: Record<string, unknown>;
  projectionsGenerated: number;
}

export interface UpdateLeaseData extends Partial<CreateLeaseData> {
  status?: "active" | "terminated" | "expired" | "pending";
  signature_status?: "pending" | "signed";
  signed_contract_path?: string | null;
  termination_date?: string | null;
  termination_reason?: string | null;
  billing_logs?: BillingLog[];
}

export function useLeases() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();

  return useQuery({
    queryKey: ["leases", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("leases")
        .select(`
          *,
          tenant:contacts!leases_tenant_contact_id_fkey(id, name, email, phone, whatsapp, document_number, address, city, state, neighborhood, postal_code),
          owner:contacts!leases_owner_contact_id_fkey(id, name, email, phone, document_number, address, city, state, neighborhood, postal_code),
          unit:units(id, unit_number, address, city, state, neighborhood, postal_code, registration_number, cib, area, rent_price, condo_fee, iptu, property:properties(name))
        `)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message || error.details || "Erro inesperado");

      return (data || []).map((lease) => ({
        ...lease,
        // CRITICAL: Explicitly map adjustment fields to ensure propagation
        next_adjustment_date: lease.next_adjustment_date ?? null,
        adjustment_index: lease.adjustment_index ?? null,
        billing_automation: (lease.billing_automation as unknown as BillingAutomation) || {
          reminder_5_days: true,
          reminder_due_day: true,
          reminder_3_days_late: true,
          send_method: "whatsapp",
        },
        billing_logs: (lease.billing_logs as unknown as BillingLog[]) || [],
        guarantor_data: lease.guarantor_data as unknown as GuarantorData | null,
        payment_info: lease.payment_info as unknown as PaymentInfo | null,
      })) as unknown as Lease[];
    },
    enabled: !!user,
  });
}

export function useLeaseByUnitId(unitId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lease", "unit", unitId],
    queryFn: async () => {
      if (!user || !unitId) return null;

      const { data, error } = await supabase
        .from("leases")
        .select(`
          *,
          tenant:contacts!leases_tenant_contact_id_fkey(id, name, email, phone, whatsapp, document_number, address, city, state, neighborhood, postal_code),
          owner:contacts!leases_owner_contact_id_fkey(id, name, email, phone, document_number, address, city, state, neighborhood, postal_code),
          unit:units(id, unit_number, address, city, state, neighborhood, postal_code, registration_number, cib, area, rent_price, condo_fee, iptu, property:properties(name))
        `)
        .eq("unit_id", unitId)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message || error.details || "Erro inesperado");

      if (!data) return null;

      // CRITICAL: Ensure adjustment fields use null fallback to prevent undefined propagation
      return {
        ...data,
        next_adjustment_date: data.next_adjustment_date ?? null,
        adjustment_index: data.adjustment_index ?? null,
        billing_automation: (data.billing_automation as unknown as BillingAutomation) || {
          reminder_5_days: true,
          reminder_due_day: true,
          reminder_3_days_late: true,
          send_method: "whatsapp",
        },
        billing_logs: (data.billing_logs as unknown as BillingLog[]) || [],
        guarantor_data: data.guarantor_data as unknown as GuarantorData | null,
        payment_info: data.payment_info as unknown as PaymentInfo | null,
      } as unknown as Lease;
    },
    enabled: !!user && !!unitId,
  });
}

export function useLeasesByUnitId(unitId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["leases", "unit", unitId],
    queryFn: async () => {
      if (!user || !unitId) return [] as Lease[];

      const { data, error } = await supabase
        .from("leases")
        .select(`
          *,
          tenant:contacts!leases_tenant_contact_id_fkey(id, name, email, phone, whatsapp, document_number, address, city, state, neighborhood, postal_code),
          owner:contacts!leases_owner_contact_id_fkey(id, name, email, phone, document_number, address, city, state, neighborhood, postal_code),
          unit:units(id, unit_number, address, city, state, neighborhood, postal_code, registration_number, cib, area, rent_price, condo_fee, iptu, property:properties(name)),
          subdivision:unit_subdivisions(id, label, area)
        `)
        .eq("unit_id", unitId)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message || error.details || "Erro inesperado");

      return (data || []).map((lease: any) => ({
        ...lease,
        next_adjustment_date: lease.next_adjustment_date ?? null,
        adjustment_index: lease.adjustment_index ?? null,
        billing_automation: (lease.billing_automation as unknown as BillingAutomation) || {
          reminder_5_days: true,
          reminder_due_day: true,
          reminder_3_days_late: true,
          send_method: "whatsapp",
        },
        billing_logs: (lease.billing_logs as unknown as BillingLog[]) || [],
        guarantor_data: lease.guarantor_data as unknown as GuarantorData | null,
        payment_info: lease.payment_info as unknown as PaymentInfo | null,
      })) as unknown as Lease[];
    },
    enabled: !!user && !!unitId,
  });
}


export function useCreateLease() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeaseData): Promise<CreateLeaseResult> => {
      if (!user) throw new Error("Usuário não autenticado");

      // Step 1: Create the lease
      const { data: lease, error } = await supabase
        .from("leases")
        .insert({
          broker_id: effectiveBrokerId || user.id,
          unit_id: data.unit_id,
          unit_subdivision_id: data.unit_subdivision_id || null,
          tenant_contact_id: data.tenant_contact_id,
          owner_contact_id: data.owner_contact_id || null,
          rent_amount: data.rent_amount,
          admin_fee_percentage: data.admin_fee_percentage || 10,
          due_day: data.due_day,
          deposit_amount: data.deposit_amount || 0,
          start_date: data.start_date,
          end_date: data.end_date || null,
          cib: data.cib || null,
          is_dimob_deductible: data.is_dimob_deductible ?? true,
          billing_automation: (data.billing_automation || {
            reminder_5_days: true,
            reminder_due_day: true,
            reminder_3_days_late: true,
            send_method: "whatsapp",
          }) as unknown as Json,
          notes: data.notes || null,
          adjustment_index: data.adjustment_index || "IGPM",
          next_adjustment_date: data.next_adjustment_date || null,
          contract_status: "active",
          guarantee_type: data.guarantee_type || "caucao",
          guarantor_data: data.guarantor_data as unknown as Json || null,
          payment_info: data.payment_info as unknown as Json || null,
          is_indefinite_term: data.is_indefinite_term ?? false,
          adjustment_periodicity_months: data.adjustment_periodicity_months ?? 12,
          fire_insurance: (data.fire_insurance as unknown as Json) ?? null,
          iptu_charge: (data.iptu_charge as unknown as Json) ?? null,
          additional_obligations: (data.additional_obligations as unknown as Json) ?? [],
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message || error.details || "Erro inesperado");

      // Step 2: Sync unit tenant from lease (uses real start_date for tenant history)
      const { error: syncError } = await supabase.rpc("sync_unit_tenant_from_lease", {
        p_unit_id: data.unit_id,
        p_tenant_contact_id: data.tenant_contact_id,
        p_lease_id: lease.id,
        p_start_date: data.start_date,
      });

      if (syncError) {
        console.error("Failed to sync unit tenant from lease:", syncError);
      }

      // Lançamentos financeiros NÃO são gerados aqui.
      // A criação de parcelas passa obrigatoriamente pela confirmação do usuário
      // em ConfirmLeaseProjectionDialog (ver src/lib/lease-projection.ts).
      const projectionsGenerated = 0;

      return { lease, projectionsGenerated };
    },
    onSuccess: async () => {
      await invalidateLeaseQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}

export function useUpdateLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLeaseData }) => {
      const updateData: Record<string, unknown> = { ...data };

      if (data.billing_automation) {
        updateData.billing_automation = data.billing_automation as unknown as Json;
      }

      if (data.billing_logs) {
        updateData.billing_logs = data.billing_logs as unknown as Json;
      }

      if (data.additional_obligations !== undefined) {
        updateData.additional_obligations =
          (data.additional_obligations as unknown as Json) ?? [];
      }

      const { error } = await supabase
        .from("leases")
        .update(updateData)
        .eq("id", id);

      if (error) throw new Error(error.message || error.details || "Erro ao salvar");
    },
    onSuccess: async () => {
      await invalidateLeaseQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}

export interface TerminateLeaseParams {
  leaseId: string;
  terminationDate?: string;
  terminationReason?: string;
  deleteFutureTransactions?: boolean;
}

export interface TerminateLeaseResult {
  deletedTransactions: number;
}

export function useTerminateLease() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: TerminateLeaseParams): Promise<TerminateLeaseResult> => {
      const { 
        leaseId, 
        terminationDate = format(new Date(), "yyyy-MM-dd"),
        terminationReason,
        deleteFutureTransactions = true 
      } = params;

      if (!user) throw new Error("Usuário não autenticado");

      // Step 1: Get the lease first to get unit_id
      const { data: lease, error: fetchError } = await supabase
        .from("leases")
        .select("unit_id, broker_id")
        .eq("id", leaseId)
        .single();

      if (fetchError) {
        console.error("Error fetching lease:", fetchError);
        throw new Error(`Erro ao buscar contrato: ${fetchError.message}`);
      }
      if (!lease) throw new Error("Contrato não encontrado");

      let deletedCount = 0;

      // Step 2: Delete future pending transactions if requested
      if (deleteFutureTransactions) {
        try {
          const { data: deleted, error: deleteError } = await supabase
            .from("financial_transactions")
            .delete()
            .eq("broker_id", lease.broker_id)
            .eq("reference", `lease:${leaseId}`)
            .eq("status", "pending")
            .gte("due_date", terminationDate)
            .select("id");

          if (deleteError) {
            console.error("Error deleting future transactions:", deleteError);
            // Continue - we still want to terminate the lease
          } else {
            deletedCount = deleted?.length || 0;
            console.log(`Deleted ${deletedCount} future transactions for lease ${leaseId}`);
          }
        } catch (error) {
          console.error("Exception deleting transactions:", error);
          // Continue with termination even if transaction deletion fails
        }
      }

      // Step 3: Update lease status with termination info
      // CRITICAL: Removed manual verification (Step 2.5) - trust Supabase error handling
      const { error: updateError } = await supabase
        .from("leases")
        .update({ 
          status: "terminated",
          contract_status: "terminated",
          termination_date: terminationDate,
          termination_reason: terminationReason || null,
        })
        .eq("id", leaseId);

      // If error is null, consider success - no need for .select() verification
      if (updateError) {
        console.error("[useTerminateLease] Error updating lease:", updateError);
        throw new Error(`Erro ao encerrar contrato: ${updateError.message}`);
      }

      console.log("[useTerminateLease] Lease terminated successfully:", leaseId);

      // Step 4: Update unit as vacant
      try {
        const { error: unitError } = await supabase
          .from("units")
          .update({
            is_occupied: false,
            tenant_contact_id: null,
          })
          .eq("id", lease.unit_id);

        if (unitError) {
          console.error("Error updating unit:", unitError);
          // Don't throw - lease was already terminated successfully
        }
      } catch (error) {
        console.error("Exception updating unit:", error);
        // Don't throw - lease was already terminated
      }

      // Sincronização best-effort do status da unidade (sugestão automática)
      await syncUnitStatusForLease(lease.unit_id);

      return { deletedTransactions: deletedCount };

    },
    onSuccess: async () => {
      await invalidateLeaseQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}

// Hook to update lease signature status
export function useUpdateLeaseSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leaseId, 
      signatureStatus, 
      signedContractPath 
    }: { 
      leaseId: string; 
      signatureStatus: "pending" | "signed";
      signedContractPath?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {
        signature_status: signatureStatus,
      };

      if (signedContractPath !== undefined) {
        updateData.signed_contract_path = signedContractPath;
      }

      const { error } = await supabase
        .from("leases")
        .update(updateData)
        .eq("id", leaseId);

      if (error) throw new Error(error.message || error.details || "Erro ao salvar");
    },
    onSuccess: async () => {
      await invalidateLeaseQueries(queryClient);
    },
  });
}

// Utility to generate WhatsApp/Email links for billing
export function generateBillingMessage(
  lease: Lease,
  type: "reminder" | "due" | "overdue",
  month: string
): { whatsappPhone: string; emailLink: string; message: string } {
  const tenantName = lease.tenant?.name || "Inquilino";
  const unitName = lease.unit?.unit_number || "Imóvel";
  const propertyName = lease.unit?.property?.name;
  const address = propertyName ? `${unitName} - ${propertyName}` : unitName;
  const amount = lease.rent_amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  let message = "";
  let subject = "";

  switch (type) {
    case "reminder":
      subject = `Lembrete: Aluguel ${month} - ${address}`;
      message = `Olá ${tenantName}!\n\nLembramos que o aluguel de ${month} referente ao imóvel ${address} vence no dia ${lease.due_day}.\n\nValor: ${amount}\n\nAtenciosamente.`;
      break;
    case "due":
      subject = `Aluguel Vencendo Hoje - ${address}`;
      message = `Olá ${tenantName}!\n\nO aluguel de ${month} referente ao imóvel ${address} vence hoje.\n\nValor: ${amount}\n\nPor favor, envie o comprovante após o pagamento.\n\nAtenciosamente.`;
      break;
    case "overdue":
      subject = `Aviso: Aluguel em Atraso - ${address}`;
      message = `Olá ${tenantName}!\n\nIdentificamos que o aluguel de ${month} referente ao imóvel ${address} encontra-se em atraso.\n\nValor: ${amount}\n\nSolicitamos a regularização o quanto antes para evitar acréscimo de multa e juros.\n\nAtenciosamente.`;
      break;
  }

  const phone = (lease.tenant?.whatsapp || lease.tenant?.phone || "").replace(/\D/g, "");
  const email = lease.tenant?.email || "";

  const encodedMessage = encodeURIComponent(message);
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(message);

  return {
    whatsappPhone: phone ? formatPhoneForWhatsApp(phone) : "",
    emailLink: email ? `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}` : "",
    message,
  };
}
