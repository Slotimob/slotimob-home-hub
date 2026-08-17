import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { HelpTooltip } from "@/components/help/HelpTooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Building2, ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Landmark, Edit } from "lucide-react";
import { CreateBankAccountDialog } from "@/components/finance/CreateBankAccountDialog";
import { SmartCurrency, formatCurrencyFull } from "@/hooks/useSmartCurrency";
import { useProgressiveBalance } from "@/hooks/useProgressiveBalance";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

export default function FinanceBanks() {
  const navigate = useNavigate();
  const { accounts, totals, isLoading } = useProgressiveBalance();
  const { isOwner, hasPermission } = usePermissions();
  const canEdit = isOwner || hasPermission('finance_overview', 'edit');
  const canCreate = isOwner || hasPermission('finance_overview', 'create');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);

  const handleCreate = () => {
    setEditAccount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (account: any) => {
    setEditAccount(account);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditAccount(null);
  };

  const handleViewTransactions = (accountId: string) => {
    navigate(`/finance/transactions?bankAccountId=${accountId}`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <AppLayout>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-1.5">
                <Landmark className="h-5 w-5 sm:h-6 sm:w-6" />
                Bancos
                <HelpTooltip featureKey="finance.bank_accounts" />
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gerencie todas as contas bancárias e acompanhe saldos reais vs projetados
              </p>
            </div>
            {canCreate && (
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            )}
          </div>

          {/* Totals Summary */}
          {!isLoading && accounts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardDescription className="text-xs">Saldo Real Total</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <span className={cn(
                    "text-xl font-bold",
                    totals.realBalance >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    <SmartCurrency value={totals.realBalance} forceCompact showTooltip={false} />
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardDescription className="text-xs">Projeção Total</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <span className={cn(
                    "text-xl font-bold",
                    totals.projectedBalance >= 0 ? "text-muted-foreground" : "text-amber-500"
                  )}>
                    <SmartCurrency value={totals.projectedBalance} forceCompact showTooltip={false} />
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardDescription className="text-xs">Receitas Pendentes</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <span className="text-xl font-bold text-emerald-500">
                    <SmartCurrency value={totals.pendingIncome} forceCompact showTooltip={false} />
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardDescription className="text-xs">Despesas Pendentes</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <span className="text-xl font-bold text-red-500">
                    <SmartCurrency value={totals.pendingExpenses} forceCompact showTooltip={false} />
                  </span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Accounts List */}
          <Card>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
              <CardTitle className="text-base sm:text-lg">Contas Bancárias</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {isLoading ? "Carregando contas..." : `${accounts.length} conta(s) cadastrada(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhuma conta bancária cadastrada
                  </p>
                  {canCreate && (
                    <Button onClick={handleCreate} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Conta
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={cn(
                        "p-3 sm:p-4 rounded-lg border transition-colors",
                        account.hasCashFlowRisk
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-card hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className="p-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: `${account.color}20` }}
                          >
                            <Building2 className="h-4 w-4" style={{ color: account.color || '#10b981' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{account.name}</p>
                              {account.is_default && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Conta Padrão</Badge>
                              )}
                            </div>
                            {account.bank_name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {account.bank_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {account.hasCashFlowRisk && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Risco de caixa futuro detectado</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(account)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Real Balance */}
                        <div className="rounded-md bg-muted/50 p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Saldo em Conta</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "font-bold text-sm cursor-help",
                                  account.realBalance >= 0 ? "text-emerald-500" : "text-red-500"
                                )}
                              >
                                <SmartCurrency value={account.realBalance} forceCompact showTooltip={false} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">{formatCurrencyFull(account.realBalance)}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Valor confirmado (conciliado)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Projected Balance */}
                        <div className="rounded-md bg-muted/50 p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Projeção</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "text-sm cursor-help flex items-center gap-1",
                                  account.projectedBalance >= 0 ? "text-muted-foreground" : "text-amber-500"
                                )}
                              >
                                {account.projectedBalance !== account.realBalance && (
                                  account.projectedBalance > account.realBalance
                                    ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    : <TrendingDown className="h-3 w-3 text-amber-500" />
                                )}
                                <SmartCurrency value={account.projectedBalance} forceCompact showTooltip={false} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-mono text-xs">{formatCurrencyFull(account.projectedBalance)}</p>
                              <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                                <p>+ Receitas pendentes: {formatCurrencyFull(account.pendingIncome)}</p>
                                <p>- Despesas pendentes: {formatCurrencyFull(account.pendingExpenses)}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={() => handleViewTransactions(account.id)}
                      >
                        Ver lançamentos
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <CreateBankAccountDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleSuccess}
          editAccount={editAccount}
        />
      </AppLayout>
    </TooltipProvider>
  );
}
