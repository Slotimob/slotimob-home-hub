import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatCurrencyBRL as formatCurrency } from "@/utils/unitPricing";
import type { PlannedInstallment } from "@/lib/lease-projection";

/** Estado editável de um bloco de projeção (aluguel ou encargo). */
export interface BlockConfig {
  /**
   * Competência inicial no formato `yyyy-MM-dd`.
   * O mês define a competência; o dia define a emissão (data contábil).
   */
  competency: string;
  /** 1º vencimento no formato `yyyy-MM-dd`. */
  firstDueDate: string;
  /** Nº de parcelas. */
  months: number;
  /** Valor de cada parcela. */
  amount: number;
}

/** Período de competência (`yyyy-MM`) derivado da data completa. */
export const competencyPeriodOf = (competency: string) => (competency || "").slice(0, 7);

/** Dia de emissão (1–31) derivado da data de competência. */
export const issueDayOf = (competency: string) => {
  const day = Number((competency || "").slice(8, 10));
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
};


export interface ProjectionBlockProps {
  blockKey: string;
  title: string;
  icon: ReactNode;
  transactionType: "income" | "expense";
  installments: PlannedInstallment[];
  config: BlockConfig;
  onConfigChange: (patch: Partial<BlockConfig>) => void;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  selected: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: (keys: string[]) => void;
  onClearAll: (keys: string[]) => void;
  /** Aviso inline (ex.: valor da parcela não definido no contrato). */
  warning?: ReactNode;
  /** Nota discreta (ex.: encargo de texto livre lançado sem categoria). */
  notice?: string;
  /** Rótulo do campo de competência (IPTU usa "exercício"). */
  competencyLabel?: string;
  /** Esconde o campo de nº de parcelas quando o bloco é de parcela única. */
  hideMonths?: boolean;
}

const brDate = (iso: string) => {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
};

export function ProjectionBlock({
  blockKey,
  title,
  icon,
  transactionType,
  installments,
  config,
  onConfigChange,
  enabled,
  onEnabledChange,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  warning,
  notice,
  competencyLabel = "Competência inicial (emissão)",
  hideMonths = false,
}: ProjectionBlockProps) {
  const selectableKeys = installments.filter((i) => !i.alreadyExists).map((i) => i.key);
  const selectedList = installments.filter((i) => selected.has(i.key) && !i.alreadyExists);
  const total = selectedList.reduce((sum, i) => sum + i.amount, 0);

  return (
    <section className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <p className="text-sm font-medium truncate">{title}</p>
          <Badge variant="secondary" className="text-[10px]">
            {transactionType === "income" ? "Receita" : "Despesa"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectedList.length} de {installments.length} parcelas ·{" "}
            <span className="font-medium text-foreground">{formatCurrency(total)}</span>
          </span>
          <div className="flex items-center gap-2">
            <Label htmlFor={`launch-${blockKey}`} className="text-xs text-muted-foreground">
              Lançar agora
            </Label>
            <Switch
              id={`launch-${blockKey}`}
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
          </div>
        </div>
      </header>

      {warning}

      {notice && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 [text-wrap:pretty]">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label
            htmlFor={`competency-${blockKey}`}
            className="text-xs h-4 flex items-center gap-1"
          >
            {competencyLabel}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="O que é a competência (emissão)"
                    className="text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px]">
                  Data contábil do lançamento. O mês define a competência e o dia define a
                  emissão no DRE.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id={`competency-${blockKey}`}
            type="date"
            className="h-9"
            value={config.competency}
            onChange={(e) => onConfigChange({ competency: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`firstdue-${blockKey}`} className="text-xs h-4 flex items-center">
            1º vencimento
          </Label>
          <Input
            id={`firstdue-${blockKey}`}
            type="date"
            className="h-9"
            value={config.firstDueDate}
            onChange={(e) => onConfigChange({ firstDueDate: e.target.value })}
          />
        </div>
        {!hideMonths && (
          <div className="space-y-1.5">
            <Label htmlFor={`months-${blockKey}`} className="text-xs h-4 flex items-center">
              Nº de parcelas
            </Label>
            <Input
              id={`months-${blockKey}`}
              type="number"
              min={1}
              className="h-9 tabular-nums"
              value={config.months}
              onChange={(e) =>
                onConfigChange({ months: Math.max(Number(e.target.value) || 1, 1) })
              }
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`amount-${blockKey}`} className="text-xs h-4 flex items-center">
            Valor da parcela
          </Label>
          <CurrencyInput
            id={`amount-${blockKey}`}
            className="h-9"
            value={config.amount ? String(config.amount) : ""}
            onChange={(v) => onConfigChange({ amount: parseFloat(v) || 0 })}
          />
        </div>
      </div>

      {enabled && installments.length > 0 && (
        <div className="space-y-2">
          {/* Desktop: tabela com cabeçalho fixo e rolagem interna */}
          <div className="hidden sm:block rounded-md border border-border max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="w-9 p-2" />
                  <th className="p-2 font-medium">Competência</th>
                  <th className="p-2 font-medium">Emissão</th>
                  <th className="p-2 font-medium">Vencimento</th>
                  <th className="p-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((i) => (
                  <tr
                    key={i.key}
                    className={`border-t border-border ${i.alreadyExists ? "opacity-50" : ""}`}
                  >
                    <td className="p-2">
                      <Checkbox
                        checked={selected.has(i.key)}
                        disabled={i.alreadyExists}
                        onCheckedChange={() => onToggle(i.key)}
                        aria-label={`Lançar ${i.description}`}
                      />
                    </td>
                    <td className="p-2">
                      {i.competencyLabel}
                      {i.alreadyExists && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Já lançado
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 tabular-nums">{brDate(i.issueDate)}</td>
                    <td className="p-2 tabular-nums">{brDate(i.dueDate)}</td>
                    <td className="p-2 text-right tabular-nums">{formatCurrency(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: lista, nunca rolagem lateral */}
          <ul className="sm:hidden space-y-2 max-h-72 overflow-y-auto">
            {installments.map((i) => (
              <li
                key={i.key}
                className={`rounded-md border border-border p-2 flex items-start gap-2 ${
                  i.alreadyExists ? "opacity-50" : ""
                }`}
              >
                <Checkbox
                  checked={selected.has(i.key)}
                  disabled={i.alreadyExists}
                  onCheckedChange={() => onToggle(i.key)}
                  aria-label={`Lançar ${i.description}`}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{i.competencyLabel}</span>
                    <span className="text-sm tabular-nums">{formatCurrency(i.amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Emissão {brDate(i.issueDate)} · Vence {brDate(i.dueDate)}
                  </p>
                  {i.alreadyExists && (
                    <Badge variant="secondary" className="text-[10px]">
                      Já lançado
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onSelectAll(selectableKeys)}
            >
              Marcar todas
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => onClearAll(selectableKeys)}
            >
              Desmarcar todas
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProjectionBlock;
