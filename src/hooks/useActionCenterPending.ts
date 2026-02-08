import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";

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

export interface PendingContract {
  id: string;
  unit_id: string;
  unit_number: string;
  tenant_name: string;
  tenant_phone?: string;
  rent_amount: number;
  contract_status: string | null;
  next_adjustment_date: string | null;
  adjustment_index: string | null;
  issue_type: "pending_signature" | "adjustment_due" | "adjustment_overdue";
}

export interface ActionCenterData {
  receivables: PendingReceivable[];
  payables: PendingPayable[];
  contracts: PendingContract[];
  totalCount: number;
  isLoading: boolean;
}

export function useActionCenterPending(): ActionCenterData {
  const { user } = useAuth();
  const today = startOfDay(new Date());
  const upcomingLimit = addDays(today, 3); // Include items due in 3 days

  // Fetch overdue/upcoming receivables (income with pending status)
  const { data: receivables = [], isLoading: loadingReceivables } = useQuery({
    queryKey: ["action-center-receivables", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          description,
          amount,
          due_date,
          unit_id,
          contact_id,
          unit:units(unit_number),
          contact:contacts(name, phone, whatsapp)
        `)
        .eq("broker_id", user.id)
        .eq("type", "income")
        .eq("status", "pending")
        .not("due_date", "is", null)
        .lte("due_date", upcomingLimit.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => {
        const dueDate = new Date(item.due_date!);
        const isOverdue = isBefore(dueDate, today);
        const daysOverdue = isOverdue
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

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
          days_overdue: daysOverdue,
        } as PendingReceivable;
      });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch overdue/upcoming payables (expense with pending status)
  const { data: payables = [], isLoading: loadingPayables } = useQuery({
    queryKey: ["action-center-payables", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          description,
          amount,
          due_date,
          unit_id,
          obligation_type,
          unit:units(unit_number)
        `)
        .eq("broker_id", user.id)
        .eq("type", "expense")
        .eq("status", "pending")
        .not("due_date", "is", null)
        .not("unit_id", "is", null)
        .lte("due_date", upcomingLimit.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => {
        const dueDate = new Date(item.due_date!);
        const isOverdue = isBefore(dueDate, today);
        const daysOverdue = isOverdue
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: item.id,
          description: item.description,
          amount: item.amount,
          due_date: item.due_date!,
          unit_id: item.unit_id,
          unit_number: item.unit?.unit_number || undefined,
          obligation_type: item.obligation_type,
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
        } as PendingPayable;
      });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch contracts with issues (pending signature or adjustment due)
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["action-center-contracts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const adjustmentLimit = addDays(today, 30); // 30 days window for adjustments

      const { data, error } = await supabase
        .from("leases")
        .select(`
          id,
          unit_id,
          rent_amount,
          contract_status,
          next_adjustment_date,
          adjustment_index,
          unit:units(unit_number),
          tenant_contact:contacts!leases_tenant_contact_id_fkey(name, phone, whatsapp)
        `)
        .eq("broker_id", user.id)
        .eq("status", "active")
        .or(
          `contract_status.eq.Pending_Signature,next_adjustment_date.lte.${adjustmentLimit.toISOString().split("T")[0]}`
        )
        .order("next_adjustment_date", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || [])
        .map((lease) => {
          let issueType: PendingContract["issue_type"] | null = null;

          if (lease.contract_status === "Pending_Signature") {
            issueType = "pending_signature";
          } else if (lease.next_adjustment_date) {
            const adjustmentDate = new Date(lease.next_adjustment_date);
            if (isBefore(adjustmentDate, today)) {
              issueType = "adjustment_overdue";
            } else if (isBefore(adjustmentDate, adjustmentLimit)) {
              issueType = "adjustment_due";
            }
          }

          if (!issueType) return null;

          return {
            id: lease.id,
            unit_id: lease.unit_id,
            unit_number: lease.unit?.unit_number || "—",
            tenant_name: lease.tenant_contact?.name || "—",
            tenant_phone: lease.tenant_contact?.whatsapp || lease.tenant_contact?.phone || undefined,
            rent_amount: lease.rent_amount,
            contract_status: lease.contract_status,
            next_adjustment_date: lease.next_adjustment_date,
            adjustment_index: lease.adjustment_index,
            issue_type: issueType,
          } as PendingContract;
        })
        .filter(Boolean) as PendingContract[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const totalCount = receivables.length + payables.length + contracts.length;
  const isLoading = loadingReceivables || loadingPayables || loadingContracts;

  return {
    receivables,
    payables,
    contracts,
    totalCount,
    isLoading,
  };
}
