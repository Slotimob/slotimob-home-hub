import { Cloud, Headphones, ShieldCheck, Smartphone } from 'lucide-react';

const benefits = [
  {
    icon: Cloud,
    title: 'Nuvem Segura',
    description: 'Seus dados armazenados em servidores de alta disponibilidade. Backup automático e criptografia de ponta a ponta.',
  },
  {
    icon: Headphones,
    title: 'Suporte Especializado',
    description: 'Time real pronto para ajudar. Respostas em menos de 2 horas nos dias úteis.',
  },
  {
    icon: ShieldCheck,
    title: '100% Dentro da LGPD',
    description: 'Dados dos seus clientes tratados com transparência e conformidade total com a lei de proteção de dados.',
  },
  {
    icon: Smartphone,
    title: 'Acesso pelo Celular',
    description: 'Use pelo navegador do celular ou instale como aplicativo. Funciona em qualquer dispositivo, a qualquer hora.',
  },
];

export function InfrastructureBenefits() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Infraestrutura
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tecnologia que você pode confiar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Construído com as mesmas tecnologias usadas por bancos e fintechs.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {benefits.map((b) => (
            <div key={b.title} className="text-center p-6 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <b.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
