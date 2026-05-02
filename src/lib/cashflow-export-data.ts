import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CashflowMovement {
  date: string;
  description: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  bank_account_id: string | null;
}

export interface CashflowAccountSummary {
  bank_account: { id: string; name: string; bank_name: string | null; color: string | null; balance: number };
  opening_balance: number;
  closing_balance: number;
  total_in: number;
  total_out: number;
  movements: CashflowMovement[];
}

export interface CashflowExportData {
  period: { from: Date; to: Date };
  consolidated: {
    opening_balance: number;
    closing_balance: number;
    total_in: number;
    total_out: number;
    movements: CashflowMovement[];
  };
  by_account: CashflowAccountSummary[];
}

const isEffectivelyPaid = (t: { status: string; is_reconciled: boolean | null }) =>
  t.status === "paid" || t.is_reconciled === true;

export async function buildCashflowExport(opts: {
  from: Date;
  to: Date;
  accountIds: string[] | "all";
  mode: "consolidated" | "by_account";
}): Promise<CashflowExportData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const dateFrom = format(opts.from, "yyyy-MM-dd");
  const dateTo = format(opts.to, "yyyy-MM-dd");

  // Fetch bank accounts
  const { data: allAccounts } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("broker_id", user.id)
    .order("name");

  const accounts = (allAccounts || []).filter(a =>
    opts.accountIds === "all" || opts.accountIds.includes(a.id)
  );

  // Fetch all transactions in period
  let txQuery = supabase
    .from("financial_transactions")
    .select("*, category:financial_categories(name)")
    .eq("broker_id", user.id)
    .gte("due_date", dateFrom)
    .lte("due_date", dateTo)
    .order("due_date", { ascending: true });

  const { data: transactions } = await txQuery;
  const paidTx = (transactions || []).filter(isEffectivelyPaid);

  // Historical transactions for opening balance
  let histQuery = supabase
    .from("financial_transactions")
    .select("amount, type, status, is_reconciled, bank_account_id")
    .eq("broker_id", user.id)
    .lt("due_date", dateFrom);

  const { data: historicalTx } = await histQuery;
  const paidHistorical = (historicalTx || []).filter(isEffectivelyPaid);

  // Build consolidated
  const consolidatedOpeningIncome = paidHistorical.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const consolidatedOpeningExpense = paidHistorical.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const consolidatedOpening = consolidatedOpeningIncome - consolidatedOpeningExpense;

  const totalIn = paidTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = paidTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const movements: CashflowMovement[] = paidTx.map(t => ({
    date: t.due_date || t.transaction_date,
    description: t.description,
    category: t.category?.name || "-",
    type: t.type as "income" | "expense",
    amount: Number(t.amount),
    bank_account_id: t.bank_account_id,
  }));

  // Build per account
  const by_account: CashflowAccountSummary[] = accounts.map(account => {
    const accountHistIncome = paidHistorical.filter(t => t.bank_account_id === account.id && t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const accountHistExpense = paidHistorical.filter(t => t.bank_account_id === account.id && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const opening = (account.initial_balance || 0) + accountHistIncome - accountHistExpense;

    const acctMovements = movements.filter(m => m.bank_account_id === account.id);
    const acctIn = acctMovements.filter(m => m.type === "income").reduce((s, m) => s + m.amount, 0);
    const acctOut = acctMovements.filter(m => m.type === "expense").reduce((s, m) => s + m.amount, 0);

    return {
      bank_account: {
        id: account.id,
        name: account.name,
        bank_name: account.bank_name,
        color: account.color,
        balance: account.balance || 0,
      },
      opening_balance: opening,
      closing_balance: opening + acctIn - acctOut,
      total_in: acctIn,
      total_out: acctOut,
      movements: acctMovements,
    };
  });

  return {
    period: { from: opts.from, to: opts.to },
    consolidated: {
      opening_balance: consolidatedOpening,
      closing_balance: consolidatedOpening + totalIn - totalOut,
      total_in: totalIn,
      total_out: totalOut,
      movements,
    },
    by_account,
  };
}
