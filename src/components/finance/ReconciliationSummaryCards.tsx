import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock } from "lucide-react";

interface ReconciliationSummaryCardsProps {
  totalImported: number;
  totalReconciled: number;
  totalPending: number;
}

export function ReconciliationSummaryCards({
  totalImported,
  totalReconciled,
  totalPending,
}: ReconciliationSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cards = [
    {
      title: "Total Extrato",
      value: totalImported,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Conciliado",
      value: totalReconciled,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Pendente",
      value: totalPending,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden min-h-[80px]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className={`text-base sm:text-lg font-bold ${card.color} break-words`}>
                  {formatCurrency(card.value)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
