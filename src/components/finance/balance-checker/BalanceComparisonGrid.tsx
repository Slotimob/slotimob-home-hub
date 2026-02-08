import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CheckCircle2, AlertTriangle, FileText, Keyboard, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TransactionCompositionSheet } from "./TransactionCompositionSheet";
import { BankStatementCompositionSheet } from "./BankStatementCompositionSheet";
import { UnreconciledTransactionsSheet } from "./UnreconciledTransactionsSheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalculatedInfo {
  netFlow: number;
  earliestDate: string;
  latestDate: string;
  entriesCount: number;
}

interface BalanceComparisonGridProps {
  // Bank Balance (Column 1)
  hasOFXBalance: boolean;
  ofxBalance: number | null;
  ofxDate: string | null;
  hasCalculatedBalance: boolean;
  calculatedBalance: number | null;
  calculatedInfo: CalculatedInfo | null;
  manualBankBalance: string;
  onManualBankBalanceChange: (value: string) => void;
  useManualInput: boolean;
  onToggleManualInput: (manual: boolean) => void;

  // System Balance (Column 2)
  systemBalance: number | null;
  initialBalance: number;
  bankAccountId: string;
  dateFrom: string;  // YYYY-MM-DD string
  dateTo: string;    // YYYY-MM-DD string

  // Difference (Column 3)
  isLoading: boolean;
}

export function BalanceComparisonGrid({
  hasOFXBalance,
  ofxBalance,
  ofxDate,
  hasCalculatedBalance,
  calculatedBalance,
  calculatedInfo,
  manualBankBalance,
  onManualBankBalanceChange,
  useManualInput,
  onToggleManualInput,
  systemBalance,
  initialBalance,
  bankAccountId,
  dateFrom,
  dateTo,
  isLoading,
}: BalanceComparisonGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate effective bank balance with priority: Manual > OFX > Calculated
  const effectiveBankBalance = (() => {
    if (useManualInput) return parseFloat(manualBankBalance) || 0;
    if (hasOFXBalance) return ofxBalance || 0;
    if (hasCalculatedBalance) return calculatedBalance || 0;
    return parseFloat(manualBankBalance) || 0;
  })();

  const hasValidBankInput = useManualInput
    ? manualBankBalance !== ""
    : (hasOFXBalance || hasCalculatedBalance);

  // Calculate difference
  const difference = hasValidBankInput && systemBalance !== null
    ? effectiveBankBalance - systemBalance
    : null;
  
  const isMatched = difference !== null && Math.abs(difference) < 0.01;

  // Determine which source is being used
  const getSourceLabel = () => {
    if (useManualInput) return null;
    if (hasOFXBalance) return { icon: FileText, text: "Via OFX", variant: "secondary" as const };
    if (hasCalculatedBalance) return { icon: Calculator, text: "Calculado", variant: "outline" as const };
    return null;
  };

  const sourceLabel = getSourceLabel();

  // Check if we have any entries to show composition
  const hasEntriesData = hasOFXBalance || hasCalculatedBalance;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Column 1: Bank Reality */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-medium text-muted-foreground">Saldo no Banco</h4>
          {sourceLabel && !useManualInput && (
            <Badge variant={sourceLabel.variant} className="text-[10px] gap-1">
              <sourceLabel.icon className="h-3 w-3" />
              {sourceLabel.text}
            </Badge>
          )}
        </div>

        {/* Priority 1: OFX Balance */}
        {hasOFXBalance && !useManualInput ? (
          <div className="space-y-2">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(ofxBalance || 0)}
            </p>
            {ofxDate && (
              <p className="text-xs text-muted-foreground">
                Extraído em {new Date(ofxDate + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            )}
            {/* Two action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 h-7 px-2"
                onClick={() => onToggleManualInput(true)}
              >
                <Keyboard className="h-3 w-3" />
                Digitar manualmente
              </Button>
              <BankStatementCompositionSheet
                bankAccountId={bankAccountId}
                dateFrom={dateFrom}
                dateTo={dateTo}
                calculatedBalance={ofxBalance || 0}
                initialBalance={initialBalance}
              />
            </div>
          </div>
        ) : hasCalculatedBalance && !useManualInput ? (
          /* Priority 2: Calculated from entries */
          <div className="space-y-2">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(calculatedBalance || 0)}
            </p>
            {calculatedInfo && (
              <p className="text-xs text-muted-foreground">
                Calculado de {calculatedInfo.entriesCount} lançamentos
                <br />
                <span className="text-[10px]">
                  ({format(new Date(calculatedInfo.earliestDate + "T12:00:00"), "dd/MM", { locale: ptBR })} 
                  {" → "}
                  {format(new Date(calculatedInfo.latestDate + "T12:00:00"), "dd/MM", { locale: ptBR })})
                </span>
              </p>
            )}
            {/* Two action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 h-7 px-2"
                onClick={() => onToggleManualInput(true)}
              >
                <Keyboard className="h-3 w-3" />
                Digitar manualmente
              </Button>
              <BankStatementCompositionSheet
                bankAccountId={bankAccountId}
                dateFrom={dateFrom}
                dateTo={dateTo}
                calculatedBalance={calculatedBalance || 0}
                initialBalance={initialBalance}
              />
            </div>
          </div>
        ) : (
          /* Priority 3: Manual Input */
          <div className="space-y-2">
            <CurrencyInput
              value={manualBankBalance}
              onChange={onManualBankBalanceChange}
              placeholder="0,00"
              className="text-center text-lg font-bold h-12"
            />
            <p className="text-[10px] text-muted-foreground text-center">
              Consulte seu app do banco e digite o saldo atual
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(hasOFXBalance || hasCalculatedBalance) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 h-7"
                  onClick={() => {
                    onToggleManualInput(false);
                    onManualBankBalanceChange("");
                  }}
                >
                  {hasOFXBalance ? (
                    <>
                      <FileText className="h-3 w-3" />
                      Usar saldo do OFX
                    </>
                  ) : (
                    <>
                      <Calculator className="h-3 w-3" />
                      Usar saldo calculado
                    </>
                  )}
                </Button>
              )}
              {hasEntriesData && (
                <BankStatementCompositionSheet
                  bankAccountId={bankAccountId}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  calculatedBalance={calculatedBalance || ofxBalance || 0}
                  initialBalance={initialBalance}
                />
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Column 2: System Reality */}
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Saldo no Sistema</h4>
        
        {isLoading ? (
          <div className="h-12 animate-pulse bg-muted rounded" />
        ) : (
          <div className="space-y-2">
            <p className="text-2xl font-bold">
              {systemBalance !== null ? formatCurrency(systemBalance) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Saldo Inicial + Receitas − Despesas (conciliadas)
            </p>
            {systemBalance !== null && (
              <div className="flex flex-col items-start gap-1 pt-1">
                <TransactionCompositionSheet
                  bankAccountId={bankAccountId}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  initialBalance={initialBalance}
                  systemBalance={systemBalance}
                />
                <UnreconciledTransactionsSheet
                  bankAccountId={bankAccountId}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Column 3: The Verdict */}
      <Card 
        className={cn(
          "p-4 space-y-3 transition-colors",
          hasValidBankInput && isMatched && "bg-emerald-500/10 border-emerald-500/30",
          hasValidBankInput && !isMatched && difference !== null && "bg-red-500/10 border-red-500/30"
        )}
      >
        <h4 className="text-sm font-medium text-muted-foreground">O Veredito</h4>
        
        {!hasValidBankInput ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Informe o saldo do banco para comparar
            </p>
          </div>
        ) : isLoading ? (
          <div className="h-12 animate-pulse bg-muted rounded" />
        ) : isMatched ? (
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="text-lg font-bold text-emerald-600">Caixa Batido!</p>
            <p className="text-xs text-emerald-600/80">
              O sistema está em sincronia com o banco
            </p>
          </div>
        ) : difference !== null ? (
          <div className="text-center space-y-2">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-lg font-bold text-red-600">
              {difference > 0 ? "Faltam" : "Sobram"} {formatCurrency(Math.abs(difference))}
            </p>
            <p className="text-xs text-red-600/80">
              {difference > 0
                ? "O banco tem mais do que o sistema registrou"
                : "O sistema registrou mais do que o banco mostra"}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        )}
      </Card>
    </div>
  );
}
