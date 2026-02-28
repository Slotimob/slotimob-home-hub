import { MessageSquare, Globe, ShieldCheck, Landmark, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const integrations = [
  { icon: MessageSquare, label: 'WhatsApp' },
  { icon: Globe, label: 'Meta Ads' },
  { icon: ShieldCheck, label: 'Google Login' },
  { icon: Landmark, label: 'Bancos (OFX)' },
  { icon: FileCheck, label: 'LGPD' },
];

export function IntegrationsStrip() {
  return (
    <section className="py-14 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          Integrado ao seu dia a dia. Conectamos sua imobiliária ao mundo digital.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
          {integrations.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 group cursor-default"
            >
              <div className="p-3 rounded-xl bg-background border border-border/50 shadow-sm group-hover:border-primary/30 group-hover:shadow-md transition-all">
                <item.icon className={cn(
                  'h-6 w-6 text-muted-foreground/50 group-hover:text-primary transition-colors'
                )} />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
