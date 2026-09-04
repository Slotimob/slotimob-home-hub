import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { addDays, isBefore, startOfDay, subHours } from "date-fns";
import { toDateOnly } from "@/lib/date-only";

export interface PendingReceivable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  unit_id: string | null;
  unit_number?: string;
  contact_id: string | null;
  contact_name?: string;
  contact_phone?: string;
  is_overdue: boolean;
  days_overdue: number;
}

export interface PendingPayable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  unit_id: string | null;
  unit_number?: string;
  obligation_type: string | null;
  is_overdue: boolean;
  days_overdue: number;
}

export type ContractIssueType =
  | "pending_setup"
  | "pending_signature"
  | "adjustment_due"
  | "adjustment_overdue"
  | "expiring"
  | "expired";

export interface PendingContract {
  id: string;
  lease_status: string | null;
  unit_id: string;
  unit_number: string;
  property_name?: string;
  tenant_name: string;
  tenant_phone?: string;
  rent_amount: number;
  contract_status: string | null;
  next_adjustment_date: string | null;
  end_date: string | null;
  adjustment_index: string | null;
  issue_type: ContractIssueType;
}

export interface PendingProposalFollowup {
  id: string;
  lead_name: string;
  unit_id: string | null;
  unit_number?: string;
  property_name?: string;
  created_at: string;
  hours_since_sent: number;
  /** "draft" = ainda não enviada; "sent" = enviada há +48h sem retorno */
  kind: "draft" | "followup";
}

export interface PendingMaintenance {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string | null;
  estimated_cost: number | null;
  unit_id: string | null;
  property_id: string | null;
  asset_label?: string;
  is_overdue: boolean;
  days_overdue: number;
}

export interface ActionCenterData {
  receivables: PendingReceivable[];
  payables: PendingPayable[];
  contracts: PendingContract[];
  proposalFollowups: PendingProposalFollowup[];
  maintenances: PendingMaintenance[];
  totalCount: number;
  isLoading: boolean;
}

const diffDays = (from: Date, to: Date) =>
  Math.floor((from.getTime() - to.getTime()) / (1000 * 60 * 60 * 24));

/**
 * Fonte ÚNICA de pendências da página /gestao/afazeres.
 * Cobre: financeiro a receber/pagar, contratos (configuração pendente,
 * assinatura, reajuste, vencimento), propostas (rascunho e follow-up)
 * e manutenções/atividades não concluídas.
 */
export function useActionCenterPending(): ActionCenterData {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const brokerId = effectiveBrokerId || user?.id || null;

  const today = startOfDay(new Date());
  const upcomingLimit = addDays(today, 3);
  const iso = (d: Date) => toDateOnly(d);

  const { data: receivables = [], isLoading: loadingReceivables } = useQuery({
    queryKey: ["action-center-receivables", brokerId],
    queryFn: async () => {
      if (!brokerId) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          id, description, amount, due_date, unit_id, contact_id,
          unit:units(unit_number),
          contact:contacts(name, phone, whatsapp)
        `)
        .eq("broker_id", brokerId)
        .eq("type", "income")
        .eq("status", "pending")
        .not("due_date", "is", null)
        .lte("due_date", iso(upcomingLimit))
        .order("due_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => {
        const dueDate = new Date(item.due_date!);
        const isOverdue = isBefore(dueDate, today);
        return {
          id: item.id,
          description: item.description,
          amount: item.amount,
          due_date: item.due_date!,
          unit_id: item.unit_id,
          unit_number: item.unit?.unit_number || undefined,
          contact_id: item.contact_id,
          contact_name: item.contact?.name || undefined,
          contact_phone: item.contact?.whatsapp || item.contact?.phone || undefined,
          is_overdue: isOverdue,
          days_overdue: isOverdue ? diffDays(today, dueDate) : 0,
        } as PendingReceivable;
      });
    },
    enabled: !!brokerId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: payables = [], isLoading: loadingPayables } = useQuery({
    queryKey: ["action-center-payables", brokerId],
    queryFn: async () => {
      if (!brokerId) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          id, description, amount, due_date, unit_id, obligation_type,
          unit:units(unit_number)
        `)
        .eq("broker_id", brokerId)
        .eq("type", "expense")
        .eq("status", "pending")
        .not("due_date", "is", null)
        .lte("due_date", iso(upcomingLimit))
        .order("due_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => {
        const dueDate = new Date(item.due_date!);
        const isOverdue = isBefore(dueDate, today);
        return {
          id: item.id,
          description: item.description,
          amount: item.amount,
          due_date: item.due_date!,
          unit_id: item.unit_id,
          unit_number: item.unit?.unit_number || undefined,
          obligation_type: item.obligation_type,
          is_overdue: isOverdue,
          days_overdue: isOverdue ? diffDays(today, dueDate) : 0,
        } as PendingPayable;
      });
    },
    enabled: !!brokerId,
    staleTime: 1000 * 60 * 5,
  });

  /**
   * Contratos: NÃO filtra por status='active' (bug corrigido) — contratos com
   * status 'pending' são esqueletos aguardando configuração/ativação e também
   * são pendências reais.
   */
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["action-center-contracts", brokerId],
    queryFn: async () => {
      if (!brokerId) return [];

      const adjustmentLimit = addDays(today, 30);
      const expiringLimit = addDays(today, 90);

      const { data, error } = await supabase
        .from("leases")
        .select(`
          id, status, unit_id, rent_amount, contract_status, signature_status,
          signed_contract_path, next_adjustment_date, end_date, adjustment_index,
          unit:units(unit_number, property:properties(name)),
          tenant_contact:contacts!leases_tenant_contact_id_fkey(name, phone, whatsapp)
        `)
        .eq("broker_id", brokerId)
        .in("status", ["pending", "active"])
        .order("next_adjustment_date", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || [])
        .map((lease: any) => {
          let issueType: ContractIssueType | null = null;

          if (lease.status === "pending") {
            issueType = "pending_setup";
          } else if (
            lease.contract_status === "Pending_Signature" ||
            ((lease.signature_status === "pending" || !lease.signature_status) &&
              !lease.signed_contract_path)
          ) {
            issueType = "pending_signature";
          } else if (lease.next_adjustment_date) {
            const adjustmentDate = new Date(lease.next_adjustment_date);
            if (isBefore(adjustmentDate, today)) issueType = "adjustment_overdue";
            else if (isBefore(adjustmentDate, adjustmentLimit)) issueType = "adjustment_due";
          }

          if (!issueType && lease.end_date) {
            const endDate = new Date(lease.end_date);
            if (isBefore(endDate, today)) issueType = "expired";
            else if (isBefore(endDate, expiringLimit)) issueType = "expiring";
          }

          if (!issueType) return null;

          return {
            id: lease.id,
            lease_status: lease.status,
            unit_id: lease.unit_id,
            unit_number: lease.unit?.unit_number || "—",
            property_name: lease.unit?.property?.name || undefined,
            tenant_name: lease.tenant_contact?.name || "—",
            tenant_phone:
              lease.tenant_contact?.whatsapp || lease.tenant_contact?.phone || undefined,
            rent_amount: lease.rent_amount,
            contract_status: lease.contract_status,
            next_adjustment_date: lease.next_adjustment_date,
            end_date: lease.end_date,
            adjustment_index: lease.adjustment_index,
            issue_type: issueType,
          } as PendingContract;
        })
        .filter(Boolean) as PendingContract[];
    },
    enabled: !!brokerId,
    staleTime: 1000 * 60 * 5,
  });

  /** Propostas: rascunhos (não enviadas) + enviadas há mais de 48h sem retorno */
  const { data: proposalFollowups = [], isLoading: loadingProposals } = useQuery({
    queryKey: ["action-center-proposals", brokerId],
    queryFn: async () => {
      if (!brokerId) return [];

      const threshold48h = subHours(new Date(), 48).toISOString();

      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id, lead_name, unit_id, status, created_at,
          unit:units(unit_number),
          property:properties(name)
        `)
        .eq("broker_id", brokerId)
        .in("status", ["draft", "sent"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || [])
        .filter((p: any) => p.status === "draft" || p.created_at <= threshold48h)
        .map((p: any) => ({
          id: p.id,
          lead_name: p.lead_name || "Lead sem nome",
          unit_id: p.unit_id,
          unit_number: p.unit?.unit_number || undefined,
          property_name: p.property?.name || undefined,
          created_at: p.created_at,
          hours_since_sent: Math.floor(
            (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)
          ),
          kind: p.status === "draft" ? "draft" : "followup",
        })) as PendingProposalFollowup[];
    },
    enabled: !!brokerId,
    staleTime: 1000 * 60 * 5,
  });

  /** Manutenções / atividades de ativos ainda não concluídas */
  const { data: maintenances = [], isLoading: loadingMaintenances } = useQuery({
    queryKey: ["action-center-maintenances", brokerId],
    queryFn: async () => {
      if (!brokerId) return [];

      const { data, error } = await (supabase as any)
        .from("property_activities")
        .select(`
          id, title, activity_type, scheduled_at, estimated_cost, unit_id, property_id,
          unit:units(unit_number),
          property:properties(name)
        `)
        .eq("broker_id", brokerId)
        .eq("is_completed", false)
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((a: any) => {
        const scheduled = a.scheduled_at ? new Date(a.scheduled_at) : null;
        const isOverdue = !!scheduled && isBefore(scheduled, today);
        const assetLabel =
          a.unit?.unit_number && a.property?.name
            ? `${a.property.name} · ${a.unit.unit_number}`
            : a.unit?.unit_number || a.property?.name || undefined;

        return {
          id: a.id,
          title: a.title,
          activity_type: a.activity_type,
          scheduled_at: a.scheduled_at,
          estimated_cost: a.estimated_cost,
          unit_id: a.unit_id,
          property_id: a.property_id,
          asset_label: assetLabel,
          is_overdue: isOverdue,
          days_overdue: isOverdue ? diffDays(today, scheduled!) : 0,
        } as PendingMaintenance;
      });
    },
    enabled: !!brokerId,
    staleTime: 1000 * 60 * 5,
  });

  const totalCount =
    receivables.length +
    payables.length +
    contracts.length +
    proposalFollowups.length +
    maintenances.length;

  const isLoading =
    loadingReceivables ||
    loadingPayables ||
    loadingContracts ||
    loadingProposals ||
    loadingMaintenances;

  return {
    receivables,
    payables,
    contracts,
    proposalFollowups,
    maintenances,
    totalCount,
    isLoading,
  };
}
