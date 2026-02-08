import { 
  Building2, 
  Users, 
  Target, 
  Calendar, 
  FileText, 
  Calculator, 
  BarChart3, 
  MessageSquare,
  LucideIcon
} from 'lucide-react';

export interface DemoSectionData {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
}

export const demoSections: DemoSectionData[] = [
  {
    id: 'imoveis',
    title: 'Gestão de Imóveis',
    description: 'Organize todos os seus empreendimentos e unidades em um só lugar. Controle status, preços e disponibilidade de forma visual e intuitiva.',
    bullets: [
      'Cadastre empreendimentos com fotos e vídeos',
      'Controle o status das unidades em tempo real',
      'Visualize disponibilidade no Kanban',
      'Taxa de comissão configurável por empreendimento',
    ],
    icon: Building2,
  },
  {
    id: 'leads',
    title: 'CRM de Leads',
    description: 'Capture leads de múltiplas origens e acompanhe toda a jornada do cliente. Mantenha um perfil completo com orçamento, preferências e histórico.',
    bullets: [
      'Capture leads do Meta Ads, Google e portais',
      'Perfil completo com orçamento e preferências',
      'Histórico de interações',
      'Integração com Facebook Lead Ads',
    ],
    icon: Users,
  },
  {
    id: 'pipeline',
    title: 'Pipeline de Vendas',
    description: 'Acompanhe todas as suas negociações em um Kanban visual. Mova negócios entre etapas com drag and drop e nunca perca uma oportunidade.',
    bullets: [
      'Kanban visual de negociações',
      'Estágios customizáveis',
      'Seleção em lote e ações em massa',
      'Histórico de movimentações',
    ],
    icon: Target,
  },
  {
    id: 'agenda',
    title: 'Agenda Inteligente',
    description: 'Gerencie visitas e atividades com uma agenda completa. Receba lembretes automáticos e confirmações de clientes por WhatsApp.',
    bullets: [
      'Visualização diária, semanal e mensal',
      'Drag and drop para criar atividades',
      'Lembretes automáticos por WhatsApp',
      'Confirmação de visitas',
    ],
    icon: Calendar,
  },
  {
    id: 'documentos',
    title: 'Documentos Digitais',
    description: 'Crie propostas e contratos profissionais em segundos. Use modelos pré-prontos e preencha automaticamente com dados do CRM.',
    bullets: [
      '14 modelos pré-prontos (propostas, contratos, recibos)',
      'Editor com preenchimento automático',
      'Geração de PDF com marca d\'água',
      'Envio por WhatsApp ou e-mail',
    ],
    icon: FileText,
  },
  {
    id: 'simuladores',
    title: 'Simuladores',
    description: 'Apresente simulações profissionais para seus clientes. Calcule financiamentos, taxas e compare imóveis lado a lado.',
    bullets: [
      'Calculadora de financiamento SFH/SBPE',
      'Cálculo de IPTU proporcional',
      'Simulador de taxas de aluguel',
      'Comparativo de imóveis lado a lado',
    ],
    icon: Calculator,
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    description: 'Acompanhe suas métricas de vendas e origem de leads. Tome decisões baseadas em dados reais do seu negócio.',
    bullets: [
      'Vendas por período',
      'Origem de leads',
      'Estatísticas de visitas',
      'Exportação em Excel e PDF',
    ],
    icon: BarChart3,
  },
  {
    id: 'integracoes',
    title: 'Integrações',
    description: 'Conecte o SLOTIMOB com suas ferramentas favoritas. WhatsApp, Meta Ads, portais imobiliários e muito mais.',
    bullets: [
      'WhatsApp Business API',
      'Facebook Lead Ads automático',
      'Portais imobiliários',
      'Webhook para sistemas externos',
    ],
    icon: MessageSquare,
  },
];
