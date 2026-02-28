import { MessageSquare, Brain, Landmark, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const integrations = [
  {
    icon: MessageSquare,
    label: 'WhatsApp Nativo',
    desc: 'Conversas e histórico centralizados no cliente',
  },
  {
    icon: Brain,
    label: 'Inteligência Artificial',
    desc: 'Resumos automáticos de atendimentos e análise de dados',
  },
  {
    icon: Landmark,
    label: 'Sincronização Bancária',
    desc: 'Baixa automática de boletos e leitura de extratos',
  },
  {
    icon: ShieldCheck,
    label: 'Proteção LGPD',
    desc: 'Segurança jurídica total para seus contratos e dados',
  },
];

export function IntegrationsStrip() {
  return (
    <section className="py-16 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4">
        <p className="text-center text-base font-semibold text-foreground mb-2">
          Tudo o que sua operação precisa, conectado em um só lugar.
        </p>
        <p className="text-center text-sm text-muted-foreground mb-10">
          Esqueça as dezenas de abas abertas.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {integrations.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 group cursor-default text-center"
            >
              <div className="p-4 rounded-2xl bg-background border border-border/50 shadow-sm group-hover:border-primary/30 group-hover:shadow-md transition-all">
                <item.icon className={cn(
                  'h-7 w-7 text-muted-foreground/50 group-hover:text-primary transition-colors'
                )} />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors block">
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground leading-snug mt-0.5 block">
                  {item.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
