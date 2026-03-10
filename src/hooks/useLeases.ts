import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Json } from "@/integrations/supabase/types";
import { useLeaseFinancialProjection, useDeleteLeaseProjections } from "@/hooks/useLeaseFinancialProjection";
import { format } from "date-fns";

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
}

export interface BillingAutomation {
  reminder_5_days: boolean;
  reminder_due_day: boolean;
  reminder_3_days_late: boolean;
  send_method: "whatsapp" | "email" | "both";
}

export interface BillingLog {
  type: "reminder_5_days" | "reminder_due_day" | "reminder_3_days_late" | "manual";
  sent_at: string;
  method: "whatsapp" | "email" | "phone" | "in_person" | "other";
  success: boolean;
  error?: string;
  sent_by?: string; // Name of the person who sent
  notes?: string;   // Optional notes about the contact
}

export interface Lease {
  id: string;
  broker_id: string;
  unit_id: string;
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
  tenant_contact_id: string;
  owner_contact_id?: string;
  rent_amount: number;
  admin_fee_percentage?: number;
  due_day: number;
  deposit_amount?: number;
  start_date: string;
  end_date?: string;
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
        .eq("broker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

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
        .eq("broker_id", user.id)
        .eq("unit_id", unitId)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

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

export function useCreateLease() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { generateProjections } = useLeaseFinancialProjection();

  return useMutation({
    mutationFn: async (data: CreateLeaseData): Promise<CreateLeaseResult> => {
      if (!user) throw new Error("Usuário não autenticado");

      // Step 1: Create the lease
      const { data: lease, error } = await supabase
        .from("leases")
        .insert({
          broker_id: user.id,
          unit_id: data.unit_id,
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
        })
        .select()
        .single();

      if (error) throw error;

      // Step 2: Update unit as occupied
      await supabase
        .from("units")
        .update({
          is_occupied: true,
          tenant_contact_id: data.tenant_contact_id,
          is_managed: true,
        })
        .eq("id", data.unit_id);

      // Step 3: Generate financial projections (rent installments)
      let projectionsGenerated = 0;

      if (!data.skipFinancialProjection) {
        try {
          // Get property_id from unit if not provided
          let propertyId = data.property_id;
          if (!propertyId) {
            const { data: unitData } = await supabase
              .from("units")
              .select("property_id")
              .eq("id", data.unit_id)
              .single();
            propertyId = unitData?.property_id || undefined;
          }

          const result = await generateProjections.mutateAsync({
            leaseId: lease.id,
            unitId: data.unit_id,
            tenantContactId: data.tenant_contact_id,
            rentAmount: data.rent_amount,
            dueDay: data.due_day,
            startDate: data.start_date,
            endDate: data.end_date,
            propertyId: propertyId,
          });

          projectionsGenerated = result.count;
        } catch (projectionError) {
          // Log but don't fail the lease creation if projections fail
          console.error("Failed to generate financial projections:", projectionError);
        }
      }

      return { lease, projectionsGenerated };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
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

      const { error } = await supabase
        .from("leases")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["lease"] });
      queryClient.invalidateQueries({ queryKey: ["leases-contracts"] });
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
        .eq("broker_id", user.id)
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
            .eq("broker_id", user.id)
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
        .eq("id", leaseId)
        .eq("broker_id", user.id);

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
          .eq("id", lease.unit_id)
          .eq("broker_id", user.id);

        if (unitError) {
          console.error("Error updating unit:", unitError);
          // Don't throw - lease was already terminated successfully
        }
      } catch (error) {
        console.error("Exception updating unit:", error);
        // Don't throw - lease was already terminated
      }

      return { deletedTransactions: deletedCount };
    },
    onSuccess: () => {
      // Invalidate all related queries without awaiting
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["lease"] });
      queryClient.invalidateQueries({ queryKey: ["lease-by-unit"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      queryClient.invalidateQueries({ queryKey: ["leases-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
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

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["leases-contracts"] });
    },
  });
}

// Utility to generate WhatsApp/Email links for billing
export function generateBillingMessage(
  lease: Lease,
  type: "reminder" | "due" | "overdue",
  month: string
): { whatsappLink: string; emailLink: string; message: string } {
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
    whatsappLink: phone ? `https://wa.me/55${phone}?text=${encodedMessage}` : "",
    emailLink: email ? `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}` : "",
    message,
  };
}
