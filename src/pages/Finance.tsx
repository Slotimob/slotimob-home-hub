import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { FinanceOverviewCards } from "@/components/finance/FinanceOverviewCards";
import { PermissionGate } from "@/components/subscription/PermissionGate";
import { FinanceCashFlowChart } from "@/components/finance/FinanceCashFlowChart";
import { FinanceCategoriesChart } from "@/components/finance/FinanceCategoriesChart";
import { FinanceRecentTransactions } from "@/components/finance/FinanceRecentTransactions";
import { FinanceBankAccountsCard } from "@/components/finance/FinanceBankAccountsCard";
import { FinanceUpcomingPayments } from "@/components/finance/FinanceUpcomingPayments";
import { FinanceUpcomingReceipts } from "@/components/finance/FinanceUpcomingReceipts";
import { FinanceFilters, FinanceFiltersState } from "@/components/finance/FinanceFilters";
import { BankAccountFilter } from "@/components/finance/BankAccountFilter";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useSelectedBankAccount } from "@/hooks/useSelectedBankAccount";
import { useProgressiveBalance } from "@/hooks/useProgressiveBalance";

const Finance = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { selectedBankAccountId, setSelectedBankAccountId, isAll } = useSelectedBankAccount();
  const { accounts } = useProgressiveBalance();

  // Initialize with current month
  const now = new Date();
  const [filters, setFilters] = useState<FinanceFiltersState>({
    unitId: "",
    period: "current_month",
    dateFrom: format(startOfMonth(now), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  const bankAccountId = isAll ? undefined : selectedBankAccountId;

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="px-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-1.5">Visão Geral Financeira <HelpTooltip featureKey="finance.overview" /></h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Acompanhe suas receitas, despesas e fluxo de caixa</p>
        </div>

        {/* Filters */}
        <FinanceFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          showPeriodSelector={true}
        />

        {/* Overview Cards */}
        <FinanceOverviewCards 
          unitId={filters.unitId}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
        />

        {/* Bank Account Filter */}
        <BankAccountFilter
          value={selectedBankAccountId}
          onChange={setSelectedBankAccountId}
          accounts={accounts}
        />

        {/* Cash Flow Section - Full Width */}
        <FinanceCashFlowChart 
          unitId={filters.unitId}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          bankAccountId={bankAccountId}
          bankAccounts={accounts}
          isAllAccounts={isAll}
        />

        {/* Categories Charts - Full Width Stacked */}
        <FinanceCategoriesChart 
          unitId={filters.unitId}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
        />

        {/* Bottom Section - Vertical stacking */}
        <div className="space-y-4 sm:space-y-6">
          {/* Full width: Upcoming Receipts */}
          <FinanceUpcomingReceipts unitId={filters.unitId} />
          
          {/* Full width: Upcoming Payments */}
          <FinanceUpcomingPayments unitId={filters.unitId} />
          
          {/* Half/Half row: Bank Accounts | Recent Transactions */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <FinanceBankAccountsCard />
            <FinanceRecentTransactions unitId={filters.unitId} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Finance;
