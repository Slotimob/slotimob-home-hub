import { 
  Building2, 
  Users, 
  FileText, 
  Calculator, 
  Calendar, 
  MessageSquare,
  BarChart3,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Building2,
    title: 'Gestão de Imóveis',
    description: 'Cadastre imóveis com fotos, vídeos e documentos. Controle status e disponibilidade em tempo real.',
  },
  {
    icon: Users,
    title: 'CRM de Leads',
    description: 'Capture leads do Meta Ads, Google e landing pages. Acompanhe toda a jornada do cliente.',
  },
  {
    icon: FileText,
    title: 'Documentos Digitais',
    description: 'Propostas, contratos e documentos digitais. Assinatura eletrônica integrada.',
  },
  {
    icon: Calculator,
    title: 'Simuladores',
    description: 'Financiamento, ITBI, custos de cartório e comparativo de imóveis em segundos.',
  },
  {
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Agende visitas, envie lembretes automáticos e sincronize com Google Calendar.',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    description: 'Envie mensagens, propostas e lembretes direto pelo WhatsApp. Histórico completo.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e Analytics',
    description: 'Métricas de vendas, origem de leads, tempo médio de fechamento e muito mais.',
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Alertas de follow-up, lembretes de visita e atualizações em tempo real.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas pensadas para corretores que querem vender mais e trabalhar de forma inteligente.
          </p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
