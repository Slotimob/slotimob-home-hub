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
