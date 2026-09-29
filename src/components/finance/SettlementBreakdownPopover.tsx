import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyBRL } from "@/utils/unitPricing";
import type { SettlementBreakdown, RentMonthSummary } from "@/lib/settlement-group";
import { formatDateOnly } from "@/lib/date-only";

interface Props {
  breakdown: SettlementBreakdown | RentMonthSummary;
  paid?: boolean;
  /** Deve ser um botão (vira o gatilho do popover). */
  children: ReactNode;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function SettlementBreakdownPopover({ breakdown: b, paid, children }: Props) {
  const f = formatCurrencyBRL;
  const m = "receipts" in b ? (b as RentMonthSummary) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 text-sm space-y-1.5" aria-label="Composição do aluguel" onClick={(e) => e.stopPropagation()}>
        <Row label="Aluguel bruto" value={f(m ? m.gross : b.rent)} />
        {b.additions > 0 && <Row label="+ Multa/juros e acréscimos" value={f(b.additions)} />}
        {b.deductions > 0 && <Row label="− Abatimentos" value={f(b.deductions)} />}
        {b.irrf > 0 && <Row label="− IRRF retido" value={f(b.irrf)} />}
        {b.discounts > 0 && <Row label="− Descontos" value={f(b.discounts)} />}
        {b.otherExpenses > 0 && <Row label="− Outros" value={f(b.otherExpenses)} />}
        <Separator className="my-1" />
        {m ? (
          <>
            <Row label="Líquido do mês" value={f(m.net)} strong />
            {m.receipts.length > 0 && <Separator className="my-1" />}
            {m.receipts.map((r) => (
              <Row
                key={r.date}
                label={`Recebido em ${r.date ? formatDateOnly(r.date, "dd/MM") : "data não informada"}`}
                value={f(r.amount)}
              />
            ))}
            {m.openBalance > 0.004 && <Row label="Saldo em aberto" value={f(m.openBalance)} strong />}
          </>
        ) : (
          <Row label={paid ? "Líquido recebido" : "Líquido a receber"} value={f(b.net)} strong />
        )}
      </PopoverContent>
    </Popover>
  );
}
