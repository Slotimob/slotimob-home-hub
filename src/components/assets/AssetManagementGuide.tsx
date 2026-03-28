import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  ArrowRight,
  CircleDollarSign,
  ClipboardCheck,
  Link2,
  CheckCircle2,
} from "lucide-react";

interface AssetManagementGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: Settings2,
    title: "1. Configure suas Obrigações",
    bullets: [
      "Abra o card do ativo e clique em "Configurar".",
      "Ative as obrigações que deseja acompanhar (Aluguel, IPTU, Condomínio…).",
      "Defina o dia de vencimento e o responsável pelo pagamento.",
    ],
  },
  {
    icon: CircleDollarSign,
    title: "2. Financeiro vs. Gerencial",
    bullets: [
      "Financeiro — lê os lançamentos do seu caixa real (DRE).",
      "Gerencial — apenas conferência de recibos de terceiros, sem impacto no fluxo de caixa.",
    ],
    badge: { label: "Gerencial", className: "border-purple-400 text-purple-600" },
  },
  {
    icon: ClipboardCheck,
    title: "3. Faça os Lançamentos",
    bullets: [
      "Receitas e despesas financeiras → aba Financeiro.",
      "Conferências gerenciais → aba Gerencial.",
      "O sistema identifica automaticamente o tipo pelo período de competência.",
    ],
  },
  {
    icon: Link2,
    title: "4. Conciliação & Vínculo Manual",
    bullets: [
      "O semáforo fica verde quando o match é automático.",
      "Se o valor ou data divergirem, use o botão "Vincular" para ensinar o sistema.",
      "A partir do vínculo, o status atualiza instantaneamente.",
    ],
  },
];

export function AssetManagementGuide({ open, onOpenChange }: AssetManagementGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            📖 Como funciona a Gestão de Ativos?
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 pb-2">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    {step.badge && (
                      <Badge variant="outline" className={`text-[10px] ${step.badge.className}`}>
                        {step.badge.label}
                      </Badge>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {step.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <ArrowRight className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-xs text-green-700">
                <strong>Dica:</strong> Quanto mais lançamentos vinculados, mais preciso fica o semáforo de saúde do ativo.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
