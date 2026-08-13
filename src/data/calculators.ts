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
  {
    slug: 'comprar-ou-alugar',
    category: 'Decisão Financeira',
    title: 'Comprar ou Alugar',
    seoTitle: 'Calculadora Comprar ou Alugar 2026: Price-to-Rent Ratio | Slotimob',
    seoDescription:
      'Descubra se vale mais a pena comprar ou alugar um imóvel usando o Price-to-Rent Ratio. Compare o preço de venda com o aluguel equivalente em segundos.',
    icon: 'Scale',
    heroH1: 'Calculadora Comprar ou Alugar: Price-to-Rent Ratio',
    intro:
      'Vale mais a pena comprar ou alugar? Esta calculadora usa o Price-to-Rent Ratio — a razão entre o valor de venda do imóvel e o total de 12 meses de aluguel equivalente — pra dar uma resposta objetiva a essa pergunta. É a mesma lógica usada por investidores para decidir entre imobilizar capital na compra de um imóvel ou alugar e investir a diferença em outros ativos. Informe o valor de venda do imóvel e o valor do aluguel mensal de um imóvel equivalente na mesma região.',
    howItWorks: [
      {
        heading: 'O que é o Price-to-Rent Ratio',
        body: 'É a razão entre o valor de venda do imóvel e o valor de 12 meses de aluguel de um imóvel equivalente: preço ÷ (aluguel mensal × 12). Quanto maior o número, mais "caro" está o imóvel em relação ao aluguel — e mais eficiente tende a ser alugar em vez de comprar.',
      },
      {
        heading: 'Como interpretar o resultado',
        body: 'Um índice acima de 25 costuma indicar que alugar e investir a diferença é mais eficiente financeiramente. Abaixo de 15, comprar tende a ser mais vantajoso no longo prazo. Entre 15 e 25, a decisão financeira está equilibrada e outros fatores pesam mais — estabilidade, tempo que pretende ficar no imóvel, perfil como investidor.',
      },
      {
        heading: 'O que esse índice não considera',
        body: 'O Price-to-Rent Ratio é uma fotografia do momento atual — não projeta valorização futura do imóvel, custos de transação (ITBI, corretagem, cartório), nem a evolução do aluguel ao longo dos anos. É um ponto de partida, não uma resposta definitiva.',
      },
    ],
    faq: [
      {
        question: 'O que significa Price-to-Rent Ratio?',
        answer:
          'É a razão entre o preço de venda de um imóvel e o valor de 12 meses de aluguel de um imóvel equivalente. Fórmula: preço do imóvel ÷ (aluguel mensal × 12).',
      },
      {
        question: 'Alugar e investir a diferença é sempre melhor quando o índice é alto?',
        answer:
          'Financeiramente, tende a ser — mas só se a diferença for realmente investida com disciplina. Fatores não financeiros (estabilidade, filhos na escola, planos de longo prazo, aversão a mudanças) também pesam bastante nessa decisão.',
      },
      {
        question: 'Esse cálculo considera a valorização futura do imóvel?',
        answer:
          'Não. É uma comparação do momento atual entre preço de compra e custo de locação. Para projetar rentabilidade e valorização ao longo dos anos, use a calculadora de Rentabilidade Imobiliária.',
      },
      {
        question: 'Qual índice é considerado "normal" no Brasil?',
        answer:
          'Varia bastante por cidade e bairro, mas historicamente o Brasil costuma ter índices mais baixos que mercados como EUA e Europa — refletindo aluguéis proporcionalmente mais caros em relação ao preço de compra em várias regiões.',
      },
    ],
    relatedSlugs: ['valor-do-imovel', 'financiamento-imobiliario', 'rentabilidade-imobiliaria'],
    disclaimer:
      'Indicador de referência para uma decisão inicial. Não considera valorização futura do imóvel, custos de transação (ITBI, corretagem, cartório), inflação do aluguel ao longo do tempo, nem o perfil de investidor. Para uma análise completa, consulte um planejador financeiro.',
    status: 'ativa',
  },
  {
    slug: 'imposto-de-renda-aluguel',
    category: 'Imposto de Renda',
    title: 'IR sobre Aluguel',
    seoTitle: 'Calculadora de Carnê-Leão 2026: Imposto de Renda sobre Aluguel | Slotimob',
    seoDescription:
      'Calcule a base do Carnê-Leão sobre o aluguel recebido: compare desconto simplificado vs deduções reais e descubra sua faixa de tributação do IRPF.',
    icon: 'Receipt',
    heroH1: 'Calculadora de Imposto de Renda sobre Aluguel (Carnê-Leão)',
    intro:
      'Quem recebe aluguel de outra pessoa física precisa recolher mensalmente o Imposto de Renda via Carnê-Leão. Esta calculadora ajuda a apurar a base de cálculo tributável — comparando o desconto simplificado de R$ 607,20 com a soma das deduções reais (taxa de administração, IPTU e condomínio pagos pelo locador) — e identifica em qual faixa de tributação sua renda mensal total se enquadra: isenta, redução proporcional ou alíquota plena. Informe o aluguel bruto recebido e escolha o método de dedução que resultar na menor base de cálculo.',
    howItWorks: [
      {
        heading: 'Desconto simplificado ou deduções reais',
        body: 'Você pode abater da receita bruta um valor fixo de R$ 607,20 por mês (desconto simplificado) ou a soma real da taxa de administração imobiliária, IPTU e condomínio efetivamente pagos por você como locador. Vale a pena calcular os dois e usar o que resultar na menor base de cálculo tributável.',
      },
      {
        heading: 'As três faixas de tributação',
        body: 'Renda mensal total (aluguel líquido + outras rendas tributáveis) até R$ 5.000,00 é isenta. Entre R$ 5.000,01 e R$ 7.350,00 há redução proporcional do imposto. Acima de R$ 7.350,00, incide a tabela progressiva do IRPF, com alíquota de até 27,5% sobre a base de cálculo.',
      },
      {
        heading: 'Por que o valor exato precisa ser apurado no programa oficial',
        body: 'As faixas de redução proporcional e a tabela progressiva completa têm fórmulas e parcelas a deduzir definidas pela Receita Federal, que podem ser atualizadas periodicamente. Por isso, para o valor exato do imposto devido nessas duas faixas, use o Programa Carnê-Leão oficial (gov.br/receitafederal) ou consulte seu contador — esta calculadora mostra a base de cálculo e a faixa aplicável, o ponto de partida para essa apuração.',
      },
    ],
    faq: [
      {
        question: 'O que é o Carnê-Leão?',
        answer:
          'É o programa da Receita Federal usado para recolhimento mensal obrigatório do Imposto de Renda sobre rendimentos recebidos de pessoas físicas — como o aluguel pago por um inquilino pessoa física (quando o locador não usa imobiliária como intermediária para fins fiscais).',
      },
      {
        question: 'Desconto simplificado ou deduções reais: qual escolher?',
        answer:
          'O que resultar na menor base de cálculo tributável. Se a soma de taxa de administração, IPTU e condomínio pagos por você ultrapassar R$ 607,20 no mês, as deduções reais tendem a ser mais vantajosas.',
      },
      {
        question: 'Se minha renda está isenta no mês, ainda preciso declarar?',
        answer:
          'Pode haver obrigatoriedade de informar os aluguéis recebidos na Declaração Anual de Ajuste, dependendo do total recebido no ano — mesmo que o Carnê-Leão mensal tenha ficado zerado. Confirme sua situação com um contador.',
      },
      {
        question: 'Essa calculadora substitui o Carnê-Leão oficial da Receita Federal?',
        answer:
          'Não. É uma ferramenta educacional para entender a base de cálculo e identificar sua faixa de tributação. O recolhimento oficial do imposto deve ser feito através do Programa Carnê-Leão da Receita Federal.',
      },
    ],
    relatedSlugs: ['ganho-de-capital', 'rentabilidade-imobiliaria', 'financiamento-imobiliario'],
    disclaimer:
      'Cálculo simplificado com fins educacionais, baseado nas faixas de isenção e redução vigentes. O valor exato do imposto devido — especialmente nas faixas de redução proporcional e alíquota plena — deve ser apurado no Programa Carnê-Leão da Receita Federal (gov.br/receitafederal) ou com a orientação de um contador. Esta ferramenta não constitui aconselhamento tributário.',
    status: 'ativa',
  },
  {
    slug: 'ganho-de-capital',
    category: 'Imposto de Renda',
    title: 'Ganho de Capital',
    seoTitle:
      'Calculadora de Imposto sobre Ganho de Capital na Venda de Imóvel 2026 | Slotimob',
    seoDescription:
      'Calcule o imposto de ganho de capital na venda de imóvel: alíquotas de 15% a 22,5%, isenção de até R$ 440 mil e isenção por reinvestimento em 180 dias.',
    icon: 'Landmark',
    heroH1: 'Calculadora de Ganho de Capital na Venda de Imóveis',
    intro:
      'Ao vender um imóvel por um valor maior do que pagou, você apura um ganho de capital — e sobre ele incide Imposto de Renda, com alíquotas progressivas de 15% a 22,5%. Esta calculadora apura o ganho de capital descontando o valor de aquisição, as benfeitorias documentadas e as despesas da venda, e estima o imposto devido faixa a faixa. Ela também identifica as duas isenções mais usadas na prática: a venda de único imóvel de até R$ 440.000 e a aplicação integral do valor da venda na compra de outro imóvel residencial no Brasil em até 180 dias. Informe os valores da operação e marque as situações aplicáveis para ver o resultado na hora.',
    howItWorks: [
      {
        heading: 'Como o ganho de capital é apurado',
        body: 'Ganho de capital = valor de venda − valor de aquisição − benfeitorias documentadas − despesas da venda (corretagem, ITBI quando aplicável). Só entram como benfeitorias os custos comprovados por nota fiscal em seu nome, informados na declaração de bens. Se o resultado for zero ou negativo, não há imposto a pagar sobre ganho.',
      },
      {
        heading: 'Tabela progressiva de alíquotas',
        body: 'Desde a Lei 13.259/2016, o imposto é progressivo por faixas: 15% sobre a parcela do ganho até R$ 5 milhões, 17,5% entre R$ 5 e R$ 10 milhões, 20% entre R$ 10 e R$ 30 milhões e 22,5% acima de R$ 30 milhões. Na grande maioria das vendas residenciais, o ganho inteiro fica na primeira faixa, com alíquota de 15%.',
      },
      {
        heading: 'Isenção do único imóvel de até R$ 440 mil',
        body: 'O Art. 39 da Lei 11.196/2005 isenta a venda do único imóvel do contribuinte, desde que o valor da alienação não ultrapasse R$ 440.000,00 e que ele não tenha vendido outro imóvel nos cinco anos anteriores.',
      },
      {
        heading: 'Isenção por reinvestimento em 180 dias',
        body: 'A mesma lei isenta o ganho quando o valor total da venda de imóvel residencial é aplicado na compra de outro imóvel residencial no Brasil dentro de 180 dias. A isenção é proporcional ao valor efetivamente reinvestido e só pode ser usada uma vez a cada cinco anos.',
      },
      {
        heading: 'Imóveis adquiridos antes de 1988',
        body: 'Imóveis comprados antes de 1988 seguem regras de transição, com percentuais de redução do ganho que variam conforme o ano de aquisição — podendo chegar à isenção total. Nesses casos, a apuração deve ser feita no programa GCAP da Receita Federal ou com um contador.',
      },
    ],
    faq: [
      {
        question: 'Quem paga imposto de ganho de capital na venda de imóvel?',
        answer:
          'Paga quem vende um imóvel por valor superior ao custo de aquisição corrigido (incluindo benfeitorias documentadas) e não se enquadra em nenhuma hipótese de isenção. O recolhimento é feito até o último dia útil do mês seguinte ao da venda, via DARF apurado no programa GCAP.',
      },
      {
        question: 'Como calcular o ganho de capital na venda de um imóvel?',
        answer:
          'Subtraia do valor de venda o valor de aquisição declarado, as benfeitorias comprovadas por nota fiscal e as despesas da venda, como corretagem e ITBI quando pago pelo vendedor. Sobre o resultado aplica-se a tabela progressiva de 15% a 22,5%.',
      },
      {
        question: 'Existe isenção de imposto na venda de imóvel?',
        answer:
          'Sim. As duas mais comuns são a venda de único imóvel por até R$ 440.000, sem outra venda nos cinco anos anteriores, e a aplicação integral do valor da venda na compra de outro imóvel residencial no Brasil em até 180 dias — esta última utilizável uma vez a cada cinco anos.',
      },
      {
        question: 'Qual a alíquota do imposto sobre ganho de capital?',
        answer:
          'A alíquota é progressiva: 15% até R$ 5 milhões de ganho, 17,5% de R$ 5 a R$ 10 milhões, 20% de R$ 10 a R$ 30 milhões e 22,5% acima de R$ 30 milhões. A maioria das operações residenciais fica integralmente na faixa de 15%.',
      },
      {
        question: 'Posso abater a reforma do imóvel do ganho de capital?',
        answer:
          'Sim, desde que os gastos estejam comprovados por nota fiscal em seu nome e tenham sido informados na declaração de bens do Imposto de Renda. Reformas sem comprovação documental não podem ser abatidas.',
      },
      {
        question: 'Esta calculadora substitui o programa GCAP?',
        answer:
          'Não. O GCAP é o programa oficial da Receita Federal para apurar e recolher o imposto sobre ganho de capital. Esta ferramenta é uma estimativa educativa para você entender a operação antes de fazer a apuração oficial.',
      },
    ],
    relatedSlugs: ['financiamento-imobiliario', 'imposto-de-renda-aluguel', 'valor-do-imovel'],
    disclaimer:
      'Estimativa educativa com base na tabela progressiva da Lei 13.259/2016. Não substitui o preenchimento do GCAP, programa oficial da Receita Federal para apuração e recolhimento do imposto. Recomendamos a orientação de um contador em casos com múltiplas isenções, pessoa jurídica ou imóvel rural.',
    status: 'ativa',
  },
  {
    slug: 'incc-imovel-na-planta',
    category: 'Financiamento',
    title: 'INCC (Imóvel na Planta)',
    seoTitle: 'Calculadora INCC 2026: Correção de Parcela de Imóvel na Planta | Slotimob',
    seoDescription:
      'Projete a correção das parcelas do seu imóvel na planta pelo INCC até a entrega das chaves: veja o valor futuro da parcela, do saldo devedor e o total corrigido.',
    icon: 'HardHat',
    heroH1: 'Calculadora de INCC: Correção de Parcelas de Imóvel na Planta',
    intro:
      'Comprou um imóvel na planta e quer saber quanto a parcela vai custar quando as chaves forem entregues? Durante a fase de obra, as parcelas e o saldo devedor de imóveis em construção são corrigidos mensalmente pelo INCC — o Índice Nacional de Custo da Construção, divulgado pela FGV. Esta calculadora projeta essa correção mês a mês, em juros compostos, mostrando o valor da parcela hoje, o valor projetado no mês da entrega e quanto isso representa em reais e em percentual acumulado. Informe a parcela atual, o índice mensal médio esperado e quantos meses faltam para a entrega — se quiser, informe também o saldo devedor para ver a projeção dele.',
    howItWorks: [
      {
        heading: 'O que é o INCC',
        body: 'O Índice Nacional de Custo da Construção (INCC), calculado pela FGV, mede a variação do custo da construção civil — materiais, equipamentos, mão de obra e serviços. É o índice usado por padrão nos contratos de compra de imóveis na planta durante toda a fase de obra.',
      },
      {
        heading: 'Como a correção é aplicada',
        body: 'A correção é composta: a cada mês, o índice incide sobre o valor já corrigido no mês anterior. A projeção usa a fórmula valor final = valor atual × (1 + índice mensal ÷ 100) elevado ao número de meses restantes até a entrega.',
      },
      {
        heading: 'A transição de índice após as chaves',
        body: 'Entregue a obra, o contrato normalmente deixa de corrigir pelo INCC e passa a usar IGP-M ou IPCA, geralmente somados a juros contratuais sobre o saldo remanescente. Isso é uma regra contratual, não uma regra legal fixa — confira no seu contrato de compra e venda qual índice passa a valer e a partir de quando.',
      },
      {
        heading: 'Por que usar um índice médio',
        body: 'O INCC é divulgado mensalmente e varia bastante ao longo do ano. Como não há como prever os valores futuros, a projeção usa um índice mensal médio repetido — útil para simular cenários (conservador, provável, pessimista), não para prever o valor exato.',
      },
    ],
    faq: [
      {
        question: 'O que é INCC?',
        answer:
          'É o Índice Nacional de Custo da Construção, calculado e divulgado mensalmente pela FGV. Ele mede a variação dos custos da construção civil e é o índice usado para corrigir parcelas e saldo devedor de imóveis na planta durante a obra.',
      },
      {
        question: 'Como calcular o reajuste da parcela de um imóvel na planta?',
        answer:
          'Aplique o índice do mês sobre o valor já corrigido no mês anterior, de forma composta: valor corrigido = valor atual × (1 + INCC mensal ÷ 100) elevado ao número de meses. Esta calculadora faz essa projeção mês a mês automaticamente.',
      },
      {
        question: 'Quando o imóvel para de ser corrigido pelo INCC?',
        answer:
          'Em geral, na entrega das chaves ou na conclusão da obra (habite-se). A partir daí, o contrato normalmente muda a correção para IGP-M ou IPCA, muitas vezes com acréscimo de juros sobre o saldo devedor. Verifique a cláusula específica do seu contrato.',
      },
      {
        question: 'Onde encontro o valor oficial do INCC?',
        answer:
          'Na FGV IBRE (portalibre.fgv.br), que divulga a série histórica mensal do índice. Use os últimos meses como referência para estimar um índice médio na simulação.',
      },
      {
        question: 'Dá para prever com exatidão quanto vou pagar na entrega?',
        answer:
          'Não. O INCC varia mês a mês conforme o custo da construção civil. A projeção com índice médio serve para dimensionar cenários e planejar o orçamento, não para cravar um valor exato.',
      },
    ],
    relatedSlugs: ['financiamento-imobiliario', 'reajuste-de-aluguel', 'valor-do-imovel'],
    disclaimer:
      'Projeção educativa baseada na repetição de um índice mensal médio. O INCC efetivo varia mês a mês e a mudança de índice após a entrega das chaves depende do que estiver previsto no contrato de compra e venda.',
    status: 'ativa',
  },
  {
    slug: 'amortizacao-e-portabilidade',
    category: 'Financiamento',
    title: 'Amortização e Portabilidade',
    seoTitle:
      'Amortização Extraordinária e Portabilidade de Financiamento: Calculadora | Slotimob',
    seoDescription:
      'Simule a amortização extraordinária do seu financiamento (reduzir prazo ou parcela) e calcule a economia da portabilidade de financiamento imobiliário para outro banco.',
    icon: 'TrendingDown',
    heroH1: 'Calculadora de Amortização Extraordinária e Portabilidade de Financiamento',
    intro:
      'Duas decisões podem reduzir bastante o custo do seu financiamento imobiliário: usar um dinheiro extra para amortizar a dívida e transferir o saldo devedor para um banco com juros menores. Nesta calculadora você faz os dois cálculos. Na aba de amortização extraordinária, informe o saldo devedor, a taxa, o prazo restante e o valor do aporte para comparar lado a lado as duas opções oferecidas pelos bancos — reduzir o prazo mantendo a parcela ou reduzir a parcela mantendo o prazo — com a economia de juros de cada uma. Na aba de portabilidade, compare o total a pagar com a taxa atual e com a taxa de outro banco, descontando os custos de avaliação e cartório, para ver a economia líquida estimada da troca.',
    howItWorks: [
      {
        heading: 'Amortização extraordinária: reduzir prazo ou reduzir parcela',
        body: 'Ao receber um aporte extra, o banco abate o valor diretamente do saldo devedor e pergunta o que você prefere: manter a parcela e encurtar o contrato, ou manter o prazo e diminuir a parcela. Na Tabela Price, manter a parcela recalcula o número de meses restantes; manter o prazo recalcula o valor da prestação. No SAC, manter a quota de amortização original reduz o prazo, e recalcular a quota sobre o novo saldo reduz todas as parcelas seguintes.',
      },
      {
        heading: 'Por que reduzir o prazo costuma economizar mais',
        body: 'Os juros incidem mês a mês sobre o saldo devedor. Encurtar o contrato diminui o tempo de exposição a esses juros, o que normalmente resulta em economia total maior. Reduzir a parcela, por outro lado, libera caixa no orçamento mensal. É uma troca entre economia acumulada e folga financeira no presente — a escolha depende da sua realidade, não existe resposta única.',
      },
      {
        heading: 'Portabilidade de financiamento imobiliário',
        body: 'A portabilidade é o direito de transferir o saldo devedor do financiamento para outra instituição que ofereça condições melhores, mantendo o mesmo imóvel como garantia. O novo banco quita a dívida no banco de origem e você passa a pagar as parcelas restantes com a nova taxa. Na prática, o primeiro passo costuma ser pedir o saldo devedor atualizado ao banco atual e levar essa proposta ao concorrente.',
      },
      {
        heading: 'Como estimamos a economia da portabilidade',
        body: 'Comparamos o total a pagar pelas parcelas restantes com a taxa atual e com a taxa do novo banco, usando a fórmula da Tabela Price e o mesmo prazo. A diferença é a economia bruta; subtraindo os custos de terceiros informados, como avaliação do imóvel e cartório, chega-se à economia líquida estimada.',
      },
    ],
    faq: [
      {
        question: 'Vale mais a pena reduzir o prazo ou reduzir a parcela?',
        answer:
          'Reduzir o prazo normalmente gera economia total de juros maior, porque diminui o tempo em que o saldo devedor fica rendendo juros. Reduzir a parcela gera menos economia, mas alivia o orçamento mensal. Se o fluxo de caixa está apertado, a segunda opção pode fazer mais sentido mesmo pagando mais juros no total.',
      },
      {
        question: 'A portabilidade de financiamento tem custo?',
        answer:
          'A portabilidade em si é gratuita por lei: a Resolução CMN nº 4.292/2013 proíbe que o banco de origem ou o de destino cobrem tarifa pela operação. Podem existir custos de terceiros, como avaliação do imóvel e registro em cartório da nova garantia, que variam por instituição e por estado.',
      },
      {
        question: 'Como funciona a portabilidade de crédito imobiliário?',
        answer:
          'Você solicita ao seu banco o saldo devedor atualizado e as condições do contrato, apresenta esses dados a outras instituições e recebe propostas. Escolhida a melhor, o novo banco quita a dívida no banco de origem e assume o crédito. O banco atual pode fazer uma contraproposta para manter o cliente — o que muitas vezes já resolve sem trocar de instituição.',
      },
      {
        question: 'Amortizar o financiamento vale a pena?',
        answer:
          'Costuma valer quando a taxa do financiamento é maior do que o rendimento líquido que o dinheiro teria numa aplicação de risco equivalente. Como as taxas de crédito imobiliário são de longo prazo e incidem sobre saldos altos, o abatimento antecipado tende a ser vantajoso — mas vale comparar com sua alternativa de investimento e manter reserva de emergência.',
      },
      {
        question: 'Posso usar o FGTS para amortizar o financiamento?',
        answer:
          'Sim, dentro das regras da Caixa e do FGTS: o saldo pode ser usado para amortizar ou quitar o saldo devedor de financiamento habitacional enquadrado no SFH, respeitando o intervalo mínimo entre utilizações. Consulte as condições vigentes junto ao agente financeiro.',
      },
      {
        question: 'Esta calculadora considera seguros e taxas administrativas?',
        answer:
          'Não. A simulação considera apenas juros, saldo devedor e prazo. Seguros obrigatórios (MIP e DFI) e a taxa de administração entram na parcela real cobrada pelo banco e no Custo Efetivo Total, por isso os valores do seu extrato podem ser diferentes.',
      },
    ],
    relatedSlugs: ['financiamento-imobiliario', 'ganho-de-capital'],
    disclaimer:
      'Estimativa educativa baseada nos valores informados. Não considera seguros obrigatórios, taxa de administração nem eventuais atualizações do saldo devedor por índice. Taxas, prazos e custos reais dependem da análise de crédito e das condições de cada instituição financeira — confirme sempre diretamente com os bancos envolvidos.',
    status: 'ativa',
  },
  {
    slug: 'rentabilidade-imobiliaria',
    category: 'Investimento',
    title: 'Rentabilidade Imobiliária',
    seoTitle: 'Calculadora de Rentabilidade Imobiliária: Cap Rate e Yield do Aluguel | Slotimob',
    seoDescription:
      'Calcule a rentabilidade imobiliária do seu imóvel alugado: yield bruto, yield líquido (cap rate) e projeção de retorno em 10 anos com valorização e reajuste.',
    icon: 'TrendingUp',
    heroH1: 'Calculadora de Rentabilidade Imobiliária (Cap Rate e Yield)',
    intro:
      'Saber quanto um imóvel alugado realmente rende exige olhar além do valor do aluguel. Esta calculadora mostra o yield bruto anual, o yield líquido — o que o mercado internacional chama de cap rate — já descontadas as despesas que ficam por conta do proprietário, e projeta o retorno acumulado ao longo de 10 anos considerando a valorização esperada do imóvel e o reajuste anual do aluguel.',
    howItWorks: [
      {
        heading: 'Yield bruto anual',
        body: 'É a conta mais simples: aluguel mensal multiplicado por 12, dividido pelo valor do imóvel, em percentual. Serve para comparar rapidamente oportunidades, mas ignora todos os custos de manter o imóvel, por isso sempre parece melhor do que o retorno real.',
      },
      {
        heading: 'Yield líquido, ou cap rate',
        body: 'Aqui subtraímos do aluguel as despesas mensais que não são repassadas ao inquilino — condomínio e IPTU quando ficam com o proprietário, taxa de administração, seguro e manutenção média — antes de anualizar e dividir pelo valor do imóvel. É o indicador que o mercado usa como capitalization rate (cap rate) e o que mais se aproxima do retorno efetivo da operação de locação.',
      },
      {
        heading: 'Projeção de 10 anos',
        body: 'A cada ano o valor do imóvel é corrigido pela valorização anual informada e o aluguel pelo reajuste anual informado, ambos de forma composta. O retorno acumulado soma os aluguéis líquidos recebidos até aquele ano com o ganho de capital ainda não realizado (a diferença entre o valor projetado do imóvel e o valor inicial). As despesas mensais são mantidas fixas ao longo de todo o período, como simplificação.',
      },
      {
        heading: 'Yield médio anualizado',
        body: 'É o retorno total percentual dividido pelo número de anos da projeção. Trata-se de uma média simples, útil para comparação rápida, e não de uma taxa interna de retorno (TIR/XIRR), que consideraria o momento exato de cada entrada de caixa.',
      },
    ],
    faq: [
      {
        question: 'O que é cap rate?',
        answer:
          'Cap rate (capitalization rate) é a taxa de capitalização de um imóvel: a receita operacional líquida anual dividida pelo valor do imóvel, em percentual. É o equivalente ao yield líquido anual — o retorno da locação já descontadas as despesas do proprietário, sem considerar financiamento nem impostos sobre a renda.',
      },
      {
        question: 'Qual a rentabilidade média de um imóvel alugado no Brasil?',
        answer:
          'Não existe um número nacional único que faça sentido. O yield varia muito conforme a cidade, o bairro, o tipo de imóvel (residencial, comercial, sala, galpão) e o perfil do contrato. Imóveis mais caros em regiões valorizadas tendem a ter yield menor e potencial de valorização maior; imóveis mais baratos ou comerciais costumam ter yield maior e risco de vacância também maior. O caminho prático é calcular o yield do seu imóvel e comparar com anúncios semelhantes na mesma região.',
      },
      {
        question: 'Yield bruto ou líquido é mais importante?',
        answer:
          'O líquido (cap rate). O bruto ignora condomínio, IPTU, taxa de administração, seguro e manutenção, que costumam consumir uma fatia relevante do aluguel. O bruto serve como filtro inicial para comparar anúncios; a decisão de investimento deve olhar o líquido.',
      },
      {
        question: 'A projeção considera vacância?',
        answer:
          'Não. A projeção assume o imóvel alugado durante os 12 meses de cada ano. Se o seu imóvel costuma ficar períodos vago, uma forma de aproximar o cenário real é reduzir o aluguel informado proporcionalmente aos meses de ocupação esperados.',
      },
      {
        question: 'O cálculo desconta Imposto de Renda?',
        answer:
          'Não. Nem o IR sobre o aluguel recebido (carnê-leão) nem o IR sobre um eventual ganho de capital na venda entram na conta. Para estimar esses impostos, use as calculadoras específicas de imposto de renda sobre aluguel e de ganho de capital.',
      },
      {
        question: 'Como comparar a rentabilidade do imóvel com investimentos financeiros?',
        answer:
          'Compare o yield líquido anual com o rendimento líquido anual da aplicação alternativa, lembrando que o imóvel ainda pode agregar valorização e que tem características próprias: menor liquidez, custos de transação altos e risco de vacância e inadimplência.',
      },
    ],
    relatedSlugs: ['imposto-de-renda-aluguel', 'ganho-de-capital', 'comprar-ou-alugar'],
    disclaimer:
      'Estimativa educativa baseada nos valores informados. A projeção assume valorização, reajuste e despesas constantes ao longo de todo o período, não considera vacância, inadimplência, custos de transação nem Imposto de Renda. Rentabilidade passada ou projetada não é garantia de retorno futuro.',
    status: 'ativa',
  },
  {
    slug: 'multa-rescisoria-aluguel',
    category: 'Locação',
    title: 'Multa Rescisória de Aluguel',
    seoTitle: 'Calculadora de Multa Rescisória de Aluguel 2026 | Slotimob',
    seoDescription:
      'Calcule a multa por quebra de contrato de aluguel de forma proporcional aos meses restantes, conforme o Art. 4º da Lei do Inquilinato (Lei 8.245/91).',
    icon: 'FileWarning',
    heroH1: 'Calculadora de Multa Rescisória de Aluguel',
    intro:
      'Quem devolve o imóvel antes do fim do contrato de locação normalmente paga uma multa — mas ela não é cobrada por inteiro. O Art. 4º da Lei do Inquilinato (Lei 8.245/91) determina que a multa seja proporcional ao tempo que ainda falta para o contrato terminar. Informe o valor do aluguel, quantos aluguéis o seu contrato prevê como multa, o prazo total e quantos meses você já cumpriu para ver o valor proporcional devido.',
    howItWorks: [
      {
        heading: 'Valor total da multa',
        body: 'É o valor do aluguel mensal multiplicado pelo número de aluguéis previstos como multa no contrato. Três aluguéis é a previsão mais comum na prática, mas o número varia de contrato para contrato — vale conferir a cláusula específica antes de calcular.',
      },
      {
        heading: 'Proporcionalidade pelos meses restantes',
        body: 'A multa total é dividida pelo prazo total do contrato em meses e multiplicada pelos meses que ainda faltam. Ou seja: quanto mais perto do fim do contrato, menor a multa. Se a rescisão acontece logo no início, a multa se aproxima do valor cheio; se acontece no último mês, ela tende a zero.',
      },
      {
        heading: 'A fórmula usada',
        body: 'Multa proporcional = (aluguel mensal × número de aluguéis ÷ prazo total em meses) × meses restantes. Os meses restantes são o prazo total menos os meses já cumpridos, com piso em zero.',
      },
      {
        heading: 'Dispensa por transferência de trabalho',
        body: 'O parágrafo único do Art. 4º dispensa o locatário da multa quando a devolução do imóvel decorre de transferência de local de trabalho imposta pelo empregador, público ou privado, desde que o locador seja notificado por escrito com pelo menos 30 dias de antecedência.',
      },
    ],
    faq: [
      {
        question: 'Como é calculada a multa por quebra de contrato de aluguel?',
        answer:
          'A multa prevista em contrato — normalmente três aluguéis — é reduzida proporcionalmente ao tempo já cumprido. Divide-se o valor total da multa pelo prazo total do contrato e multiplica-se pelos meses que ainda faltam para o término.',
      },
      {
        question: 'A multa é sempre de 3 aluguéis?',
        answer:
          'Não. Três aluguéis é o valor mais comum na prática do mercado, mas quem define é o contrato. Alguns contratos preveem dois, outros um valor fixo. Por isso o campo é editável nesta calculadora: use o número que consta na sua cláusula de multa.',
      },
      {
        question: 'Posso sair do aluguel sem pagar multa?',
        answer:
          'Em algumas situações sim. A mais clara é a do parágrafo único do Art. 4º: transferência de local de trabalho pelo empregador, com notificação escrita ao locador com no mínimo 30 dias de antecedência. Também é possível negociar a dispensa diretamente com o locador, especialmente quando o inquilino apresenta um substituto ou colabora com a nova locação.',
      },
      {
        question: 'A multa vale se o contrato já venceu e continuei no imóvel?',
        answer:
          'Depois do fim do prazo, se o inquilino permanece no imóvel sem oposição, a locação passa a vigorar por prazo indeterminado. Nesse regime não há multa rescisória proporcional: basta a notificação prévia de 30 dias para devolver o imóvel, conforme o Art. 6º da Lei 8.245/91.',
      },
      {
        question: 'A multa rescisória e a multa por atraso de aluguel são a mesma coisa?',
        answer:
          'Não. A multa rescisória é pela devolução antecipada do imóvel. A multa por atraso é uma penalidade sobre a parcela paga fora do prazo, com percentual próprio definido em contrato. São cobranças independentes.',
      },
    ],
    relatedSlugs: ['reajuste-de-aluguel', 'comprar-ou-alugar'],
    disclaimer:
      'Cálculo educativo baseado no Art. 4º da Lei 8.245/91. O valor exato da multa e eventuais cláusulas específicas dependem do que está escrito no seu contrato — consulte o contrato e, se necessário, um advogado.',
    status: 'ativa',
  },
  {
    slug: 'custo-de-mudanca',
    category: 'Planejamento',
    title: 'Custo de Mudança',
    seoTitle: 'Planilha de Custo de Mudança: organize seu orçamento | Slotimob',
    seoDescription:
      'Organize e some todos os custos da sua mudança — frete, embalagem, montagem de móveis, taxas do prédio e faxina — a partir dos orçamentos que você recebeu.',
    icon: 'Truck',
    heroH1: 'Planejador de Custo de Mudança',
    intro:
      'Mudar de imóvel custa bem mais do que o frete. Esta ferramenta reúne todas as categorias de gasto de uma mudança em um só lugar, soma os valores que você informar e mostra o peso de cada item no total. Importante: não estimamos preços. Preços de frete e de serviços de mudança variam demais por cidade, empresa e época do mês para que qualquer valor de referência genérico fosse honesto. O total que você vê é exatamente a soma dos números que você digitou.',
    howItWorks: [
      {
        heading: 'Você informa, a ferramenta organiza',
        body: 'Cada campo corresponde a uma categoria típica de custo: frete, embalagem e materiais, mão de obra para embalar e desembalar, desmontagem e montagem de móveis, seguro, taxas do prédio, faxina e outros. Preencha apenas os que se aplicam ao seu caso, com os valores dos orçamentos que você recebeu.',
      },
      {
        heading: 'Total e distribuição percentual',
        body: 'A ferramenta soma tudo e mostra quanto cada categoria representa do total. Isso ajuda a enxergar onde o dinheiro está concentrado e onde vale pedir uma segunda cotação ou fazer parte do serviço por conta própria.',
      },
      {
        heading: 'O que influencia o preço da mudança',
        body: 'Distância entre os imóveis, volume de itens e tamanho do imóvel, existência de elevador nos dois endereços, necessidade de embalagem profissional para itens frágeis e época do mês — as datas de troca de contrato concentram demanda e pressionam os preços para cima. Peça pelo menos três orçamentos antes de fechar.',
      },
      {
        heading: 'Custos que costumam ficar de fora',
        body: 'Taxas de uso de elevador de carga e reserva de vaga no condomínio, caução para eventuais danos em áreas comuns, faxina pós-mudança nos dois imóveis e seguro sobre o valor dos bens transportados são itens frequentemente esquecidos no planejamento inicial.',
      },
    ],
    faq: [
      {
        question: 'Quanto custa uma mudança?',
        answer:
          'Não existe um valor de referência confiável e nacional para dar como resposta — depende de cidade, distância, volume, andar, acesso e época do mês, e as diferenças entre empresas na mesma cidade costumam ser grandes. O caminho correto é pedir pelo menos três orçamentos com visita ou lista detalhada de itens e usar esses números reais nesta ferramenta.',
      },
      {
        question: 'Esta ferramenta estima o preço do frete?',
        answer:
          'Não, e isso é intencional. Ela é um planejador de orçamento: soma e organiza os valores que você informa. Qualquer preço por metro cúbico ou por quilômetro que apresentássemos aqui seria um chute com aparência de precisão.',
      },
      {
        question: 'Vale a pena contratar seguro de mudança?',
        answer:
          'Depende do valor dos bens transportados e da distância. Para mudanças interestaduais ou com itens de alto valor (eletrônicos, obras de arte, instrumentos), o seguro costuma representar uma fração pequena do orçamento diante do risco. Pergunte à transportadora o que a cobertura básica já inclui antes de contratar um seguro adicional.',
      },
      {
        question: 'Qual a melhor época do mês para fazer a mudança?',
        answer:
          'Início e fim de mês concentram a maior parte das mudanças, porque é quando os contratos de locação começam e terminam. Dias no meio do mês e no meio da semana costumam ter mais disponibilidade de agenda, o que ajuda na negociação.',
      },
      {
        question: 'Devo somar a multa rescisória do aluguel no custo da mudança?',
        answer:
          'Se você está saindo antes do fim do contrato, sim — é um custo real da transição. Calcule o valor proporcional na calculadora de multa rescisória e inclua o resultado no campo de outros custos.',
      },
    ],
    relatedSlugs: ['multa-rescisoria-aluguel', 'financiamento-imobiliario'],
    disclaimer:
      'Esta ferramenta organiza e soma os valores que você informar — não calculamos nem estimamos preços de frete ou serviços de mudança, porque esses variam muito por cidade, empresa e época. Peça orçamentos reais para preencher os campos.',
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
