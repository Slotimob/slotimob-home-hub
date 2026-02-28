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
      description: 'CRM, ERP e WhatsApp com IA integrados. Organize leads, imóveis e documentos. Comece grátis com 2 unidades e 14 dias de Pro.',
    },
    hero: {
      headline: 'A inteligência que sua imobiliária',
      highlightLine: 'precisava para escalar.',
      subtitle: 'CRM, ERP e WhatsApp com IA integrados em um único lugar. Comece com 2 unidades grátis e sinta o poder do Plano Pro por 14 dias.',
    },
    socialProof: ['+200 corretores ativos', '4.9★ de satisfação', 'Suporte em <2h'],
  },
  corretores: {
    slug: 'corretores',
    utmSource: 'lp_corretores',
    seo: {
      title: 'SLOTIMOB para Corretores - Venda mais com CRM Conversacional',
      description: 'CRM com WhatsApp integrado, funil de vendas inteligente e gestão de leads automática. A ferramenta que faltava para você vender mais.',
    },
    hero: {
      headline: 'Venda mais com o',
      highlightLine: 'CRM Conversacional.',
      subtitle: 'WhatsApp integrado, funil inteligente e agenda de visitas. Pare de perder leads e comece a fechar negócios.',
    },
    socialProof: ['+200 corretores ativos', 'Leads nunca se perdem', 'WhatsApp integrado'],
  },
  proprietarios: {
    slug: 'proprietarios',
    utmSource: 'lp_proprietarios',
    seo: {
      title: 'SLOTIMOB para Proprietários - Gerencie seus imóveis sem estresse',
      description: 'Controle de contratos, cobranças automáticas e relatórios financeiros. Tenha visão total dos seus ativos imobiliários.',
    },
    hero: {
      headline: 'Gerencie seus imóveis',
      highlightLine: 'sem estresse.',
      subtitle: 'Contratos, cobranças e relatórios financeiros num só lugar. Tenha visão total dos seus ativos imobiliários.',
    },
    socialProof: ['Relatórios automáticos', 'Cobranças via WhatsApp', 'Controle total'],
  },
  imobiliarias: {
    slug: 'imobiliarias',
    utmSource: 'lp_imobiliarias',
    seo: {
      title: 'SLOTIMOB para Imobiliárias - Gestão completa da sua operação',
      description: 'Gerencie equipe, leads, imóveis e finanças em uma única plataforma. Escale sua imobiliária com inteligência.',
    },
    hero: {
      headline: 'Escale sua imobiliária',
      highlightLine: 'com inteligência.',
      subtitle: 'Gerencie equipe, leads, imóveis e finanças em uma única plataforma. Do lead à escritura, tudo integrado.',
    },
    socialProof: ['Gestão de equipe', 'Pipeline completo', 'Financeiro integrado'],
  },
};

export function getSegment(slug?: string): LandingSegment {
  if (!slug) return SEGMENTS.default;
  return SEGMENTS[slug] || SEGMENTS.default;
}
