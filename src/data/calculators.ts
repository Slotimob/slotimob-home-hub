/**
 * Registry central das calculadoras públicas (SEO).
 * Cada nova calculadora deve ser adicionada aqui — o hub `/calculadoras`,
 * a página de detalhe `/calculadoras/:slug` e o sitemap leem deste array.
 */

export type CalculatorStatus = 'ativa' | 'em-breve';

export interface CalculatorHowItWorks {
  heading: string;
  body: string;
}

export interface CalculatorFaq {
  question: string;
  answer: string;
}

export interface CalculatorEntry {
  slug: string;
  category: string;
  /** Título curto, para cards e botões */
  title: string;
  seoTitle: string;
  seoDescription: string;
  /** Nome do ícone do lucide-react */
  icon: string;
  heroH1: string;
  intro: string;
  howItWorks: CalculatorHowItWorks[];
  faq: CalculatorFaq[];
  relatedSlugs: string[];
  disclaimer?: string;
  status: CalculatorStatus;
}

export const CALCULATORS: CalculatorEntry[] = [
  {
    slug: 'financiamento-imobiliario',
    category: 'Financiamento',
    title: 'Financiamento Imobiliário',
    seoTitle:
      'Calculadora de Financiamento Imobiliário 2026: SAC, Price e Renda Mínima | Slotimob',
    seoDescription:
      'Simule seu financiamento imobiliário grátis: compare parcelas SAC vs Price, veja o Custo Efetivo Total (CET) e descubra a renda mínima necessária para aprovar seu crédito.',
    icon: 'Home',
    heroH1: 'Calculadora de Financiamento Imobiliário: SAC, Price e Renda Mínima',
    intro:
      'Antes de fechar negócio com o banco, simule o financiamento do seu imóvel e entenda exatamente quanto vai pagar por mês, quanto vai pagar de juros no total e qual renda mensal precisa comprovar para o crédito ser aprovado. Esta calculadora compara os dois sistemas de amortização usados no Brasil — SAC (parcelas decrescentes) e Price (parcelas fixas) — e calcula o Custo Efetivo Total (CET) da operação. Também mostra a renda familiar mínima necessária, considerando o limite de comprometimento de renda de 30% usado pelos bancos na primeira parcela. Preencha o valor do imóvel, a entrada disponível, o prazo desejado e a taxa de juros oferecida pelo banco — o resultado sai na hora, com tabela de amortização parcela a parcela.',
    howItWorks: [
      {
        heading: 'SAC (Sistema de Amortização Constante)',
        body: 'Na SAC, a amortização (parte da parcela que reduz a dívida) é sempre a mesma — o valor financiado dividido pelo número de parcelas. Como os juros incidem sobre o saldo devedor, que vai diminuindo mês a mês, a parcela começa mais alta e cai ao longo do contrato.',
      },
      {
        heading: 'Tabela Price',
        body: 'Na Price, a parcela é fixa do início ao fim. Nos primeiros meses, a maior parte do pagamento vai para os juros; com o tempo, a proporção se inverte e mais dinheiro vai para a amortização.',
      },
      {
        heading: 'Custo Efetivo Total (CET)',
        body: 'O CET representa o custo real do financiamento, incluindo juros, seguros obrigatórios (MIP e DFI) e tarifas administrativas — é sempre mais alto que a taxa de juros nominal anunciada pelo banco, e é o número certo para comparar propostas de instituições diferentes.',
      },
      {
        heading: 'Renda mínima necessária',
        body: 'Os bancos limitam o comprometimento da renda familiar bruta a, no máximo, 30% no valor da primeira parcela. Por isso, a renda mínima estimada é: primeira parcela ÷ 0,30.',
      },
    ],
    faq: [
      {
        question: 'Qual a diferença entre SAC e Price?',
        answer:
          'Na SAC as parcelas começam maiores e diminuem com o tempo, resultando em menos juros pagos no total. Na Price as parcelas são fixas do início ao fim, o que dá mais previsibilidade mas costuma gerar um total de juros maior ao longo do contrato.',
      },
      {
        question: 'O que é CET e por que ele é mais importante que a taxa de juros anunciada?',
        answer:
          'O Custo Efetivo Total inclui, além dos juros, seguros obrigatórios e tarifas administrativas. É o número que reflete o custo real do financiamento e o mais adequado para comparar propostas entre bancos diferentes.',
      },
      {
        question: 'Quanto de renda preciso para financiar um imóvel?',
        answer:
          'Como regra geral, os bancos exigem que a parcela do financiamento não ultrapasse 30% da renda familiar bruta mensal. Esta calculadora estima essa renda mínima automaticamente a partir da primeira parcela.',
      },
      {
        question: 'Essa simulação substitui a simulação oficial do banco?',
        answer:
          'Não. Esta é uma ferramenta educacional para você entender e comparar cenários antes de negociar. Os valores finais de taxa de juros, CET e aprovação de crédito dependem da análise de crédito e das condições vigentes em cada instituição financeira.',
      },
      {
        question: 'Posso usar o FGTS na entrada do financiamento?',
        answer:
          'Em geral sim, dentro das regras do FGTS para aquisição de imóvel residencial (limite de valor do imóvel, tempo de carência entre usos, entre outras condições). Confirme as regras atualizadas diretamente com a Caixa Econômica Federal ou seu agente financeiro.',
      },
    ],
    relatedSlugs: ['amortizacao-financiamento', 'comprar-ou-alugar', 'reajuste-de-aluguel'],
    disclaimer:
      'Simulação com fins educacionais. Taxas, condições de aprovação e o Custo Efetivo Total final dependem da análise de crédito de cada instituição financeira.',
    status: 'ativa',
  },
];

export const getCalculatorBySlug = (slug?: string): CalculatorEntry | undefined =>
  CALCULATORS.find((c) => c.slug === slug);

export const getActiveCalculators = (): CalculatorEntry[] =>
  CALCULATORS.filter((c) => c.status === 'ativa');

/** Resolve slugs relacionados, ignorando calculadoras que ainda não existem. */
export const getRelatedCalculators = (slugs: string[] = []): CalculatorEntry[] =>
  slugs
    .map((s) => getCalculatorBySlug(s))
    .filter((c): c is CalculatorEntry => !!c && c.status === 'ativa');
