export interface LandingSegment {
  slug: string;
  utmSource: string;
  seo: { title: string; description: string };
  hero: {
    headline: string;
    highlightLine: string;
    subtitle: string;
  };
  socialProof: string[];
}

export const SEGMENTS: Record<string, LandingSegment> = {
  default: {
    slug: '',
    utmSource: 'lp_geral',
    seo: {
      title: 'SLOTIMOB - A inteligência que sua imobiliária precisava',
      description: 'CRM, ERP e WhatsApp com IA integrados. Organize leads, imóveis e documentos. Comece grátis com 2 unidades e 7 dias de Pro.',
    },
    hero: {
      headline: 'A inteligência que sua imobiliária',
      highlightLine: 'precisava para escalar.',
      subtitle: 'CRM, ERP e WhatsApp com IA integrados em um único lugar. Comece com 2 unidades grátis e sinta o poder do Plano Pro por 7 dias.',
    },
    socialProof: ['+200 corretores ativos', '4.9★ de satisfação', 'Suporte em <2h'],
  },
  corretores: {
    slug: 'corretores',
    utmSource: 'lp_corretores',
    seo: {
      title: 'SLOTIMOB para Corretores - O CRM Conversacional de Elite',
      description: 'Pare de perder leads no vácuo. Centralize WhatsApp, automatize seu funil e venda 3x mais com a inteligência da SlotiMob.',
    },
    hero: {
      headline: 'O CRM Conversacional que os',
      highlightLine: 'corretores de elite usam.',
      subtitle: 'Pare de perder leads no vácuo. Centralize seu WhatsApp, automatize seu funil e venda 3x mais com a inteligência da SlotiMob.',
    },
    socialProof: ['Distribuição automática de leads do WhatsApp', 'Histórico infinito de conversas', 'Chat unificado com IA'],
  },
  proprietarios: {
    slug: 'proprietarios',
    utmSource: 'lp_proprietarios',
    seo: {
      title: 'SLOTIMOB para Proprietários - Patrimônio gerido com inteligência',
      description: 'Chega de planilhas confusas. Controle total dos seus imóveis, contratos e recebimentos em uma plataforma simples e segura.',
    },
    hero: {
      headline: 'Seu patrimônio gerido com',
      highlightLine: 'inteligência profissional.',
      subtitle: 'Chega de planilhas confusas. Tenha o controle total dos seus imóveis, contratos e recebimentos em uma plataforma simples e segura.',
    },
    socialProof: ['Controle financeiro completo', 'Gestão de documentos segura', 'Relatórios de rentabilidade'],
  },
  imobiliarias: {
    slug: 'imobiliarias',
    utmSource: 'lp_imobiliarias',
    seo: {
      title: 'SLOTIMOB para Imobiliárias - Cresça com ordem e inteligência',
      description: 'Distribua leads automaticamente, supervisione atendimentos e gerencie do lead ao fechamento em uma única plataforma.',
    },
    hero: {
      headline: 'A plataforma que faz sua imobiliária',
      highlightLine: 'crescer com ordem.',
      subtitle: 'Distribua leads automaticamente para sua equipe e supervisione cada atendimento. Gestão completa do lead ao fechamento.',
    },
    socialProof: ['Visão de supervisor (Master)', 'Distribuição automática de leads do WhatsApp', 'Métricas de performance'],
  },
};

export function getSegment(slug?: string): LandingSegment {
  if (!slug) return SEGMENTS.default;
  return SEGMENTS[slug] || SEGMENTS.default;
}
