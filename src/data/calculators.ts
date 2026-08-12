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
  {
    slug: 'reajuste-de-aluguel',
    category: 'Locação',
    title: 'Reajuste de Aluguel',
    seoTitle: 'Calculadora de Reajuste de Aluguel 2026: IGP-M, IPCA e INCC',
    seoDescription:
      'Calcule o reajuste anual do seu aluguel pelo IGP-M, IPCA ou INCC. Descubra o novo valor da mensalidade em segundos, com explicação completa da Lei do Inquilinato.',
    icon: 'TrendingUp',
    heroH1: 'Calculadora de Reajuste de Aluguel: IGP-M, IPCA e INCC',
    intro:
      'A Lei do Inquilinato (Lei nº 8.245/91) permite reajustar o valor do aluguel uma vez por ano, aplicando a variação de um índice de inflação definido em contrato — geralmente o IGP-M ou o IPCA. Esta calculadora aplica a variação percentual acumulada nos últimos 12 meses sobre o valor atual do aluguel e mostra o novo valor da mensalidade e o valor do reajuste em reais. Informe o valor atual do aluguel e a variação percentual acumulada do índice escolhido nos últimos 12 meses — consulte o valor atualizado direto na fonte oficial (FGV para o IGP-M, IBGE para o IPCA) antes de aplicar formalmente.',
    howItWorks: [
      {
        heading: 'Por que só posso reajustar uma vez por ano?',
        body: 'A Lei do Inquilinato (Lei nº 8.245/91) exige um intervalo mínimo de doze meses entre reajustes de aluguel. O índice aplicado é sempre a variação acumulada nesse período de 12 meses.',
      },
      {
        heading: 'IGP-M ou IPCA: qual escolher?',
        body: 'O IGP-M (FGV) foi historicamente o índice mais usado em contratos de locação, mas por ser mais volátil em momentos de oscilação cambial, o IPCA (IBGE) — mais estável — passou a ser amplamente adotado como alternativa. O índice usado é sempre o que estiver definido no contrato.',
      },
      {
        heading: 'Como o novo valor é calculado',
        body: 'O novo aluguel é o valor atual multiplicado por (1 + variação do índice ÷ 100). Por exemplo, um aluguel de R$ 2.000 com reajuste de 4% passa a R$ 2.080.',
      },
    ],
    faq: [
      {
        question: 'Onde encontro o valor atualizado do IGP-M ou do IPCA?',
        answer:
          'O IGP-M é divulgado mensalmente pela FGV (portalibre.fgv.br) e o IPCA pelo IBGE (ibge.gov.br). O valor a usar é sempre a variação acumulada dos últimos 12 meses.',
      },
      {
        question: 'O que acontece se o índice acumulado for negativo?',
        answer:
          'Em caso de deflação acumulada, o valor do aluguel pode até diminuir no reajuste, salvo se o contrato tiver alguma cláusula de piso mínimo — o que não é comum, mas deve ser verificado no contrato.',
      },
      {
        question: 'Posso reajustar antes de completar 12 meses do último reajuste?',
        answer:
          'Como regra geral não — a Lei do Inquilinato exige intervalo mínimo de 12 meses entre reajustes, salvo acordo diferente livremente pactuado entre locador e locatário.',
      },
      {
        question: 'O reajuste é automático ou preciso avisar o inquilino?',
        answer:
          'Depende do que está previsto em contrato, mas a boa prática — e muitas vezes exigência contratual — é notificar o inquilino formalmente e por escrito com antecedência sobre o novo valor.',
      },
    ],
    relatedSlugs: ['financiamento-imobiliario', 'comprar-ou-alugar', 'multa-rescisoria-aluguel'],
    disclaimer:
      'Índices de inflação variam mensalmente. Confirme o valor acumulado dos últimos 12 meses diretamente nas fontes oficiais (FGV/IBGE) antes de aplicar o reajuste formalmente em contrato.',
    status: 'ativa',
  },
  {
    slug: 'valor-do-imovel',
    category: 'Avaliação',
    title: 'Avaliação de Imóvel',
    seoTitle: 'Calculadora de Avaliação de Imóvel 2026: Estime o Valor de Venda | Slotimob',
    seoDescription:
      'Estime o valor de mercado do seu imóvel em segundos: informe área, tipologia, vagas e características, e veja uma faixa de preço estimada por m².',
    icon: 'Building2',
    heroH1: 'Calculadora de Avaliação de Imóvel: Estime o Valor de Venda ou Locação',
    intro:
      'Quanto vale o seu imóvel? Esta calculadora usa um modelo de precificação hedônica simplificado — o mesmo princípio usado por grandes portais imobiliários — para estimar uma faixa de valor a partir do preço médio do m² na sua região e das características específicas do imóvel: tipologia, idade, vagas de garagem, suíte, estado de conservação e lazer no condomínio. Informe o valor médio do m² na sua região (consulte anúncios de imóveis similares em portais como Zap Imóveis ou QuintoAndar para essa referência) e a área útil do seu imóvel — o resultado é uma faixa estimada, não um valor exato.',
    howItWorks: [
      {
        heading: 'O que é precificação hedônica',
        body: 'É um modelo que decompõe o valor de um imóvel em características individuais (localização, área, padrão construtivo, comodidades) e aplica um ajuste percentual pra cada uma sobre um valor-base regional. É a mesma lógica usada por grandes portais imobiliários em suas ferramentas de avaliação automática (AVM).',
      },
      {
        heading: 'Por que o resultado é uma faixa, e não um número exato',
        body: 'Nenhuma calculadora automática substitui a análise de um profissional que conhece o imóvel e a região. Por isso mostramos uma faixa de variação (±8%) em vez de um valor único — o objetivo é dar um ponto de partida realista pra negociação ou para decidir se vale a pena buscar uma avaliação formal.',
      },
      {
        heading: 'Como os multiplicadores funcionam',
        body: 'Cada característica (tipologia, idade, vagas, suíte, conservação, lazer) aplica um ajuste percentual sobre o valor base (área × valor do m² da região). Coberturas e imóveis com mais vagas, por exemplo, valem proporcionalmente mais; imóveis que precisam de reforma valem proporcionalmente menos.',
      },
    ],
    faq: [
      {
        question: 'Essa calculadora substitui um laudo de avaliação profissional?',
        answer:
          'Não. Esta é uma estimativa educacional para dar um ponto de partida. Para venda, compra ou financiamento formal, um laudo de avaliação de um corretor com CRECI, engenheiro avaliador, ou a avaliação feita pelo próprio banco financiador é necessário.',
      },
      {
        question: 'Onde encontro o valor médio do m² na minha região?',
        answer:
          'Busque anúncios de imóveis parecidos com o seu (mesmo bairro, tipologia similar) em portais como Zap Imóveis, OLX ou QuintoAndar, e divida o valor anunciado pela área do imóvel. A prefeitura da sua cidade também costuma publicar plantas de valores usadas para cálculo de IPTU, que servem como referência adicional.',
      },
      {
        question: 'Por que uma cobertura vale mais que um apartamento padrão do mesmo tamanho?',
        answer:
          'Coberturas geralmente têm área extra (terraço, área privativa), maior privacidade, vista privilegiada e menor densidade de vizinhos no andar — características que o mercado historicamente paga um prêmio para ter.',
      },
      {
        question: 'O estado de conservação realmente muda tanto o valor?',
        answer:
          'Sim — um imóvel que precisa de reforma reduz o interesse de compradores que não querem lidar com obra, e o comprador tende a descontar do preço o custo estimado da reforma. Um imóvel em excelente estado, ao contrário, costuma ter um pequeno prêmio.',
      },
    ],
    relatedSlugs: ['comprar-ou-alugar', 'financiamento-imobiliario', 'rentabilidade-imobiliaria'],
    disclaimer:
      'Estimativa educacional baseada em multiplicadores de mercado típicos — não substitui avaliação profissional (laudo de engenharia, corretor com CRECI ou avaliação bancária) para fins de venda, compra ou financiamento.',
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
