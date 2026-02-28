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
    badge: 'Hub Financeiro',
    title: 'Controle financeiro blindado.',
    subtitle: 'Fluxo de caixa, DRE por unidade, conciliação bancária e cobranças — tudo reconciliado automaticamente com auditoria via Supabase.',
    reversed: true,
    features: [
      { icon: ArrowLeftRight, title: 'Conciliação Bancária', desc: 'Importe extratos OFX/CSV e concilie automaticamente com transações do sistema. Veja discrepâncias em segundos.' },
      { icon: BarChart3, title: 'DRE por Unidade', desc: 'Demonstrativo de resultado do exercício detalhado por propriedade. Receitas, despesas e lucro líquido consolidados.' },
      { icon: Wallet, title: 'Transações Recorrentes', desc: 'Aluguéis, taxas condominiais e IPTU são lançados automaticamente. Controle parcelas, baixas e atrasos.' },
      { icon: FileText, title: 'Contratos Digitais', desc: 'Templates inteligentes que preenchem automaticamente dados de contatos, imóveis e valores de negociação.' },
    ],
  },
  {
    id: 'modulo-unidades',
    badge: 'Gestão de Ativos',
    title: 'Inventário organizado de ponta a ponta.',
    subtitle: 'Propriedades, unidades, galeria otimizada e documentos integrados — com alertas de saúde do portfólio e vencimentos.',
    features: [
      { icon: Building2, title: 'Propriedades & Unidades', desc: 'Organize imóveis em propriedades com múltiplas unidades. Cadastre tipologia, metragem, valor e status de cada uma.' },
      { icon: ImageIcon, title: 'Galeria Otimizada', desc: 'Upload em lote com compressão automática (WebP). Ordene fotos por drag & drop e defina a imagem de capa.' },
      { icon: FolderOpen, title: 'Documentos Integrados', desc: 'Anexe escrituras, laudos, matrículas e contratos diretamente à unidade. Busca rápida e versionamento.' },
      { icon: Shield, title: 'Saúde do Portfólio', desc: 'Painel com semáforos de inadimplência, vencimento de contratos, reajustes pendentes e obrigações DIMOB.' },
    ],
  },
  {
    id: 'modulo-whatsapp',
    badge: 'WhatsApp & IA',
    title: 'Nunca mais perca uma conversa.',
    subtitle: 'WhatsApp integrado direto no CRM com resumos de IA, notificações de leads e automação de respostas 24/7.',
    reversed: true,
    features: [
      { icon: MessageSquare, title: 'Chat Unificado', desc: 'Todas as conversas de WhatsApp centralizadas no sistema. Histórico vinculado ao lead, sem sair do CRM.' },
      { icon: Bot, title: 'Resumos com IA', desc: 'A IA lê a conversa e gera: perfil do lead, interesses, orçamento estimado e próximo passo recomendado.' },
      { icon: Bell, title: 'Notificações Inteligentes', desc: 'Alertas quando um lead quente responde, quando há inatividade suspeita ou quando um follow-up está atrasado.' },
      { icon: Zap, title: 'Automação 24/7', desc: 'Respostas automáticas para perguntas frequentes, agendamento de visitas e qualificação inicial do lead.' },
    ],
  },
  {
    id: 'modulo-calculadoras',
    badge: 'Ferramentas',
    title: 'Calculadoras que fecham negócio.',
    subtitle: 'Simuladores de financiamento e cálculos fiscais que impressionam o cliente e aceleram a tomada de decisão.',
    features: [
      { icon: Calculator, title: 'Simulador de Financiamento', desc: 'Calcule parcelas SAC/Price, entrada mínima, taxa de juros e renda necessária. Compartilhe o resultado com o cliente.' },
      { icon: TrendingUp, title: 'Análise de Rentabilidade', desc: 'Compare retorno por aluguel vs. valorização. Veja cap rate, payback e projeção de 5 anos para cada imóvel.' },
      { icon: Receipt, title: 'Cálculos Fiscais (ITBI/IR)', desc: 'Estime ITBI na compra e IR sobre ganho de capital na venda. Apresente ao cliente com credibilidade.' },
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
