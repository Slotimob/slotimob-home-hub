import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  FileText,
  BarChart3,
  ArrowLeftRight,
  Building2,
  Shield,
  ImageIcon,
  FolderOpen,
  MessageSquare,
  Bot,
  Bell,
  Zap,
  Calculator,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleSection {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  features: { icon: LucideIcon; title: string; desc: string }[];
  reversed?: boolean;
}

const modules: ModuleSection[] = [
  {
    id: 'modulo-financeiro',
    badge: 'Controle Total',
    title: 'Bata o caixa em minutos, não em horas.',
    subtitle: 'O sistema lê o extrato do seu banco e já diz o que foi pago, o que está pendente e quanto sobrou no bolso no fim do mês. Sem complicação.',
    reversed: true,
    features: [
      { icon: ArrowLeftRight, title: 'Conciliação Automática', desc: 'Importe seu extrato bancário e o sistema identifica o que já foi pago. Você só confirma — sem digitar nada.' },
      { icon: BarChart3, title: 'Lucro Real por Imóvel', desc: 'Veja exatamente quanto cada imóvel está rendendo: receitas, despesas e o lucro líquido. Tudo separado e claro.' },
      { icon: Wallet, title: 'Cobranças no Piloto Automático', desc: 'Aluguéis, condomínio e IPTU são lançados automaticamente todo mês. Você controla parcelas, atrasos e baixas.' },
      { icon: FileText, title: 'Contratos Prontos em Segundos', desc: 'Escolha o modelo, e o sistema preenche com os dados do cliente e do imóvel. Só revisar e enviar.' },
    ],
  },
  {
    id: 'modulo-unidades',
    badge: 'Vitrine Digital',
    title: 'Seus imóveis organizados e rendendo mais.',
    subtitle: 'Fotos bonitas que carregam rápido, documentos que nunca se perdem e uma visão clara de quais imóveis estão rendendo mais — e quais precisam de atenção.',
    features: [
      { icon: Building2, title: 'Cadastro Completo', desc: 'Organize seus imóveis por propriedade, tipologia, metragem e valor. Encontre qualquer informação em segundos.' },
      { icon: ImageIcon, title: 'Fotos Profissionais', desc: 'Faça upload de várias fotos de uma vez. O sistema otimiza e organiza automaticamente. Defina a capa com um clique.' },
      { icon: FolderOpen, title: 'Documentos Sempre à Mão', desc: 'Escrituras, laudos, matrículas e contratos anexados direto ao imóvel. Busque e encontre na hora.' },
      { icon: Shield, title: 'Painel de Saúde do Portfólio', desc: 'Veja de relance: contratos vencendo, reajustes pendentes e inadimplência. O que precisa de atenção fica destacado.' },
    ],
  },
  {
    id: 'modulo-whatsapp',
    badge: 'WhatsApp Inteligente',
    title: 'Fale com o cliente sem sair do sistema.',
    subtitle: 'O WhatsApp da sua equipe conectado ao sistema. O histórico fica salvo e qualquer pessoa pode continuar o atendimento de onde o colega parou.',
    reversed: true,
    features: [
      { icon: MessageSquare, title: 'Todas as Conversas em Um Lugar', desc: 'O histórico do WhatsApp aparece junto com os dados do cliente. Sem precisar procurar no celular.' },
      { icon: Bot, title: 'Resumo Automático do Cliente', desc: 'O sistema analisa a conversa e mostra: o que o cliente quer, quanto pode pagar e qual o próximo passo.' },
      { icon: Bell, title: 'Avisos na Hora Certa', desc: 'Receba alertas quando um cliente interessado responder, quando um follow-up estiver atrasado ou quando houver inatividade.' },
      { icon: Zap, title: 'Respostas 24 Horas', desc: 'Responda perguntas frequentes automaticamente, agende visitas e qualifique clientes mesmo fora do horário comercial.' },
    ],
  },
  {
    id: 'modulo-calculadoras',
    badge: 'Poder de Argumentação',
    title: 'Calcule na frente do cliente e feche mais rápido.',
    subtitle: 'Simuladores de financiamento e cálculos fiscais que impressionam o cliente e passam confiança total. Tudo na hora, sem precisar ligar para o banco.',
    features: [
      { icon: Calculator, title: 'Simulador de Financiamento', desc: 'Calcule parcelas, entrada mínima e renda necessária na hora. Compartilhe o resultado com o cliente por WhatsApp.' },
      { icon: TrendingUp, title: 'Análise de Rentabilidade', desc: 'Compare o retorno de cada imóvel: aluguel, valorização, tempo de retorno e projeção para os próximos 5 anos.' },
      { icon: Receipt, title: 'Cálculos de Impostos', desc: 'Estime o imposto na compra e na venda. Apresente os números com segurança e credibilidade.' },
    ],
  },
];

export function FeaturesSection() {
  return (
    <section id="features">
      {modules.map((mod, idx) => (
        <div
          key={mod.id}
          id={mod.id}
          className={cn(
            'py-20 md:py-28',
            idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'
          )}
        >
          <div className="container mx-auto px-4">
            {/* Section header */}
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
                {mod.badge}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {mod.title}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {mod.subtitle}
              </p>
            </div>

            {/* Video placeholder */}
            <div className="max-w-3xl mx-auto mb-10">
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
                <p className="text-sm text-primary font-medium">
                  🎬 Assista em 1 minuto como o módulo de {mod.badge} vai acelerar seu negócio
                </p>
                <p className="text-xs text-muted-foreground mt-1">Vídeo em breve</p>
              </div>
            </div>

            {/* Feature cards grid */}
            <div className="grid gap-6 sm:grid-cols-2 max-w-5xl mx-auto">
              {mod.features.map((feat) => (
                <div
                  key={feat.title}
                  className="group rounded-xl border border-border/50 bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feat.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
