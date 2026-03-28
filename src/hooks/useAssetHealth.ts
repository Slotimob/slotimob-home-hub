import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

export type ObligationType = 
  | "rent" 
  | "condominium" 
  | "iptu" 
  | "energy" 
  | "water" 
  | "gas" 
  | "insurance" 
  | "other";

export type ObligationStatus = "paid" | "pending" | "overdue" | "ignored";

export type ResponsibleRole = "owner" | "tenant" | "agency";

export type ControlType = "financial" | "managerial";

export interface ObligationConfig {
  active: boolean;
  due_day?: number;
  responsible?: ResponsibleRole;
  installation_code?: string;
  control_type?: ControlType;
}

export interface ObligationsConfig {
  rent?: ObligationConfig;
  condominium?: ObligationConfig;
  iptu?: ObligationConfig;
  energy?: ObligationConfig;
  water?: ObligationConfig;
  gas?: ObligationConfig;
  insurance?: ObligationConfig;
  other?: ObligationConfig;
}

export interface ObligationHealth {
  type: ObligationType;
  label: string;
  status: ObligationStatus;
  dueDay: number | null;
  responsible: ResponsibleRole | null;
  installationCode?: string | null;
  controlType: ControlType;
  transactionId?: string;
  amount?: number;
}

export interface AssetHealth {
  unitId: string;
  unitNumber: string;
  propertyName: string | null;
  propertyType: string | null;
  ownerName: string | null;
  coverImage: string | null;
  obligations: ObligationHealth[];
  overallStatus: "healthy" | "attention" | "critical";
}

const OBLIGATION_LABELS: Record<ObligationType, string> = {
  rent: "Aluguel",
  condominium: "Condomínio",
  iptu: "IPTU",
  energy: "Energia",
  water: "Água",
  gas: "Gás",
  insurance: "Seguro",
  other: "Outros",
};

const OBLIGATION_CATEGORIES: Record<ObligationType, string[]> = {
  rent: ["aluguel", "rent", "locação"],
  condominium: ["condomínio", "condominio", "taxa condominial"],
  iptu: ["iptu", "imposto predial"],
  energy: ["energia", "luz", "eletricidade", "conta de luz"],
  water: ["água", "agua", "conta de água", "saneamento"],
  gas: ["gás", "gas", "conta de gás"],
  insurance: ["seguro", "seguro incêndio", "seguro residencial"],
  other: ["outros", "outras despesas"],
};

function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const start = new Date(year, month, 1).toISOString().split("T")[0];
  const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
  
  return { start, end };
}

function getCurrentMonthRange(): { start: string; end: string } {
  return getMonthRange(new Date());
}

function calculateObligationStatus(
  config: ObligationConfig,
  transaction: { status: string; transaction_date: string; due_date?: string | null; is_reconciled?: boolean } | null,
  referenceDate?: Date
): ObligationStatus {
  if (!config.active) {
    return "ignored";
  }

  const today = new Date();
  const refDate = referenceDate || today;
  const isCurrentMonth = 
    today.getFullYear() === refDate.getFullYear() && 
    today.getMonth() === refDate.getMonth();
  const isFutureMonth = refDate > today && !isCurrentMonth;
  
  // Determine the effective due date: prefer transaction's due_date, fallback to config
  const configDueDay = config.due_day || 10;
  
  if (transaction) {
    // CRITICAL: Reconciled transactions are ALWAYS treated as paid (Master Rule)
    if (transaction.is_reconciled === true) {
      return "paid";
    }
    
    // If transaction has explicit status, use it directly
    if (transaction.status === "paid") {
      return "paid";
    }
    if (transaction.status === "overdue") {
      return "overdue";
    }
    
    // For pending transactions, check if due date has passed
    if (transaction.status === "pending") {
      if (isFutureMonth) return "pending";
      
      // Use transaction's due_date if available for precise comparison
      if (transaction.due_date) {
        const dueDate = new Date(transaction.due_date);
        return today > dueDate ? "overdue" : "pending";
      }
      
      // Fallback to config due_day
      const currentDay = isCurrentMonth ? today.getDate() : refDate.getDate();
      return currentDay > configDueDay ? "overdue" : "pending";
    }
  }

  // No transaction found - determine status based on period
  if (isFutureMonth) {
    return "pending";
  }
  
  const currentDay = isCurrentMonth ? today.getDate() : refDate.getDate();
  if (currentDay > configDueDay) {
    return "overdue";
  }

  return "pending";
}

function findMatchingTransaction(
  transactions: any[],
  obligationType: ObligationType,
  unitId: string,
  competencyPeriod: string
) {
  const keywords = OBLIGATION_CATEGORIES[obligationType];
  
  // Priority 1: Exact match by obligation_type AND competency_period (strongest binding)
  const exactMatch = transactions.find((t) => {
    if (t.unit_id !== unitId) return false;
    return t.obligation_type === obligationType && t.competency_period === competencyPeriod;
  });
  
  if (exactMatch) return exactMatch;
  
  // Priority 2: Match by obligation_type only (for transactions linked but missing period)
  const typeMatch = transactions.find((t) => {
    if (t.unit_id !== unitId) return false;
    return t.obligation_type === obligationType && !t.competency_period;
  });
  
  if (typeMatch) return typeMatch;
  
  // Priority 3: Legacy fallback - match by description/category name ONLY if no obligation_type set
  // This ensures we don't accidentally match unrelated transactions
  const legacyMatch = transactions.find((t) => {
    if (t.unit_id !== unitId) return false;
    if (t.obligation_type) return false; // Skip if already typed
    
    const description = (t.description || "").toLowerCase();
    const categoryName = (t.category?.name || "").toLowerCase();
    
    return keywords.some(
      (keyword) =>
        description.includes(keyword) || categoryName.includes(keyword)
    );
  });
  
  return legacyMatch || null;
}

function calculateOverallStatus(
  obligations: ObligationHealth[]
): "healthy" | "attention" | "critical" {
  const activeObligations = obligations.filter((o) => o.status !== "ignored");
  
  if (activeObligations.length === 0) {
    return "healthy";
  }

  const hasOverdue = activeObligations.some((o) => o.status === "overdue");
  const hasPending = activeObligations.some((o) => o.status === "pending");

  if (hasOverdue) {
    return "critical";
  }
  if (hasPending) {
    return "attention";
  }
  return "healthy";
}

export function useAssetHealth(referenceDate?: Date) {
  const { user } = useAuth();
  const targetDate = referenceDate || new Date();
  const competencyPeriod = format(targetDate, "yyyy-MM");

  return useQuery({
    queryKey: ["asset-health", user?.id, competencyPeriod],
    queryFn: async () => {
      if (!user) return [];

      // Fetch only units with is_managed = true
      // Note: We show ALL managed units regardless of intent_type (rental, sale, both)
      // because even sale properties may need management/tracking
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select(`
          id,
          unit_number,
          property_type,
          cover_image_url,
          obligations_config,
          is_standalone,
          is_managed,
          intent_type,
          property:properties(name),
          owner:owners(name)
        `)
        .eq("is_managed", true)
        .order("created_at", { ascending: false });

      if (unitsError) throw unitsError;
      if (!units || units.length === 0) return [];

      // Fetch transactions for the target month using precise date filtering
      const { start, end } = getMonthRange(targetDate);
      const unitIds = units.map((u) => u.id);

      // Strategy: Fetch transactions that match the competency period OR
      // fall within the date range when competency_period is not set
      // Using two separate queries for clarity and reliability
      
      // Query 1: Transactions with explicit competency_period matching
      const { data: txByCompetency, error: txCompError } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          unit_id,
          description,
          amount,
          status,
          transaction_date,
          due_date,
          obligation_type,
          competency_period,
          is_reconciled,
          category:financial_categories(name)
        `)
        .in("unit_id", unitIds)
        .eq("competency_period", competencyPeriod);

      if (txCompError) throw txCompError;

      // Query 2: Transactions without competency_period but within date range (legacy fallback)
      const { data: txByDate, error: txDateError } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          unit_id,
          description,
          amount,
          status,
          transaction_date,
          due_date,
          obligation_type,
          competency_period,
          is_reconciled,
          category:financial_categories(name)
        `)
        .in("unit_id", unitIds)
        .is("competency_period", null)
        .gte("due_date", start)
        .lte("due_date", end);

      if (txDateError) throw txDateError;

      // Merge transactions, avoiding duplicates by id
      const txMap = new Map<string, typeof txByCompetency[0]>();
      (txByCompetency || []).forEach(tx => txMap.set(tx.id, tx));
      (txByDate || []).forEach(tx => {
        if (!txMap.has(tx.id)) txMap.set(tx.id, tx);
      });
      const transactions = Array.from(txMap.values());

      // Process each unit
      const assetHealthList: AssetHealth[] = units.map((unit) => {
        const config = (unit.obligations_config as ObligationsConfig) || {};
        const obligations: ObligationHealth[] = [];

        // Check each obligation type
        (Object.keys(OBLIGATION_LABELS) as ObligationType[]).forEach((type) => {
          const obligationConfig = config[type] || { active: false };
          const matchingTx = findMatchingTransaction(
            transactions || [],
            type,
            unit.id,
            competencyPeriod
          );

          const status = calculateObligationStatus(obligationConfig, matchingTx, targetDate);

          obligations.push({
            type,
            label: OBLIGATION_LABELS[type],
            status,
            dueDay: obligationConfig.due_day || null,
            responsible: obligationConfig.responsible || null,
            installationCode: obligationConfig.installation_code || null,
            transactionId: matchingTx?.id,
            amount: matchingTx?.amount,
          });
        });

        return {
          unitId: unit.id,
          unitNumber: unit.unit_number,
          propertyName: unit.property?.name || null,
          propertyType: unit.property_type,
          ownerName: unit.owner?.name || null,
          coverImage: unit.cover_image_url,
          obligations,
          overallStatus: calculateOverallStatus(obligations),
        };
      });

      return assetHealthList;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUnitObligationsConfig(unitId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unit-obligations-config", unitId],
    queryFn: async () => {
      if (!unitId) return null;

      const { data, error } = await supabase
        .from("units")
        .select("obligations_config")
        .eq("id", unitId)
        .single();

      if (error) throw error;
      return (data?.obligations_config as ObligationsConfig) || {};
    },
    enabled: !!user && !!unitId,
  });
}

export async function updateUnitObligationsConfig(
  unitId: string,
  config: ObligationsConfig
): Promise<void> {
  const { error } = await supabase
    .from("units")
    .update({ obligations_config: JSON.parse(JSON.stringify(config)) as Json })
    .eq("id", unitId);

  if (error) throw error;
}
