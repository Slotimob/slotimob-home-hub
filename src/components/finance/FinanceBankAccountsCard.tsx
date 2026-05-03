import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Button } from "@/components/ui/button";
import { Plus, Building2, ArrowRight, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { CreateBankAccountDialog } from "./CreateBankAccountDialog";
import { SmartCurrency, formatCurrencyFull } from "@/hooks/useSmartCurrency";
import { useProgressiveBalance } from "@/hooks/useProgressiveBalance";
import { cn } from "@/lib/utils";

export function FinanceBankAccountsCard() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { accounts, totals, isLoading } = useProgressiveBalance();

  const handleAccountCreated = () => {
    setIsCreateOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 px-3 lg:px-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-32" />
        </CardHeader>
        <CardContent className="space-y-2 px-3 lg:px-6 pb-3 lg:pb-6">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Get top 3 accounts
  const displayAccounts = accounts.slice(0, 3);

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm lg:text-base truncate flex items-center gap-1.5">Contas Bancárias <HelpTooltip featureKey="finance.bank_accounts" /></CardTitle>
              {totals.hasCashFlowRisk && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Risco de caixa futuro detectado</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <CardDescription className="text-[10px] lg:text-xs">
              Saldo Real vs Projetado
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
          {displayAccounts && displayAccounts.length > 0 ? (
            <div className="space-y-2">
              {displayAccounts.map((account) => (
                <div
                  key={account.id}
                  className={cn(
                    "p-2 lg:p-3 rounded-lg bg-muted/50 transition-colors",
                    account.hasCashFlowRisk && "ring-1 ring-amber-500/30 bg-amber-500/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="p-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        <Building2 className="h-3 w-3 lg:h-4 lg:w-4" style={{ color: account.color || '#10b981' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs lg:text-sm truncate">{account.name}</p>
                        {account.bank_name && (
                          <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{account.bank_name}</p>
                        )}
                      </div>
                    </div>
                    {account.hasCashFlowRisk && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">⚠️ Risco de caixa futuro</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Dual Balance Display */}
                  <div className="flex items-end justify-between gap-2 mt-2">
                    {/* Real Balance - Primary */}
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Saldo em Conta</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "font-bold text-sm lg:text-base cursor-help",
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

                    {/* Projected Balance - Secondary */}
                    <div className="text-right flex-1">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Projeção</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "text-xs lg:text-sm cursor-help flex items-center justify-end gap-1",
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
                </div>
              ))}

              {/* Totals Summary */}
              {accounts.length > 1 && (
                <div className={cn(
                  "p-2 lg:p-3 rounded-lg border-2 border-dashed",
                  totals.hasCashFlowRisk ? "border-amber-500/30 bg-amber-500/5" : "border-muted"
                )}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-muted-foreground">Total Consolidado</p>
                    {totals.hasCashFlowRisk && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Alerta
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Em Conta</p>
                      <span className={cn(
                        "font-bold text-sm",
                        totals.realBalance >= 0 ? "text-emerald-500" : "text-red-500"
                      )}>
                        <SmartCurrency value={totals.realBalance} forceCompact showTooltip={false} />
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Projeção</p>
                      <span className={cn(
                        "text-xs",
                        totals.projectedBalance >= 0 ? "text-muted-foreground" : "text-amber-500"
                      )}>
                        <SmartCurrency value={totals.projectedBalance} forceCompact showTooltip={false} />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => navigate("/finance/reconciliation")}
              >
                Ver todas
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Building2 className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-2">Nenhuma conta cadastrada</p>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Conta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateBankAccountDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleAccountCreated}
      />
    </TooltipProvider>
  );
}
