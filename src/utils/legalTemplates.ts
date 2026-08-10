/**
 * Legal Document Templates for Real Estate Contracts
 * Based on Brazilian Tenancy Law (Lei 8.245/91 - Lei do Inquilinato)
 * 
 * Este módulo contém contratos robustos com cláusulas baseadas na legislação brasileira.
 * As variáveis seguem o padrão {{nome_variavel}} para substituição automática.
 */

import { 
  formatCurrencyToWords, 
  numberToWords, 
  parseBRLCurrency 
} from './currencyUtils';

// Re-export for external use
export { formatCurrencyToWords, numberToWords };

/**
 * Helper to format currency with value in words (capitalized)
 * e.g., "R$ 1.500,00 (Um mil e quinhentos reais)"
 */
function formatValueWithExtension(value: string | number | undefined): string {
  if (value === undefined || value === null) return '____________________';
  
  let numericValue: number;
  
  if (typeof value === 'string') {
    // Parse BRL formatted string
    numericValue = parseBRLCurrency(value);
    if (numericValue === 0 && !value.includes('0')) {
      // If parsing failed and it's not actually zero, return original
      return value;
    }
  } else {
    numericValue = value;
  }
  
  const formattedNumeric = numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  
  const extenso = formatCurrencyToWords(numericValue);
  // Capitalize first letter only
  const extensoCapitalized = extenso.charAt(0).toUpperCase() + extenso.slice(1);
  
  return `${formattedNumeric} (${extensoCapitalized})`;
}

export interface LegalTemplate {
  id: string;
  name: string;
  type: 'rental' | 'sale' | 'management';
  description: string;
  content: string;
  variables: string[];
}

// ============================================================================
// TIPOS DE GARANTIA LOCATÍCIA
// ============================================================================

export type GuaranteeType = 'fiador' | 'caucao' | 'seguro_fianca' | 'titulo_capitalizacao' | 'none';

export interface GuarantorData {
  nome: string;
  cpf: string;
  rg?: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone?: string;
  email?: string;
  profissao?: string;
  estadoCivil?: string;
  conjuge?: {
    nome: string;
    cpf: string;
    rg?: string;
  };
  imovelGarantia?: {
    endereco: string;
    matricula: string;
    valor?: string;
  };
}

export interface DepositData {
  valor: string;
  formaPagamento: 'dinheiro' | 'transferencia' | 'cheque';
  contaDeposito?: string;
  dataDeposito?: string;
}

export interface InsuranceData {
  seguradora: string;
  apolice: string;
  vigencia: string;
  valorCobertura: string;
  premio?: string;
}

// ============================================================================
// INTERFACE DE DADOS DO CONTRATO COMPLETO
// ============================================================================

export interface FullContractData {
  // ===== DADOS DO LOCADOR (PROPRIETÁRIO) =====
  locador: {
    nome: string;
    nacionalidade?: string;
    estadoCivil?: string;
    profissao?: string;
    cpf: string;
    rg?: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep?: string;
    telefone?: string;
    email?: string;
    // Cônjuge (se casado)
    conjuge?: {
      nome: string;
      cpf: string;
      rg?: string;
    };
  };

  // ===== DADOS DO LOCATÁRIO =====
  locatario: {
    nome: string;
    nacionalidade?: string;
    estadoCivil?: string;
    profissao?: string;
    cpf: string;
    rg?: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep?: string;
    telefone?: string;
    email?: string;
    // Cônjuge (se casado)
    conjuge?: {
      nome: string;
      cpf: string;
      rg?: string;
    };
  };

  // ===== DESCRIÇÃO DO IMÓVEL (CONFORME MATRÍCULA) =====
  imovel: {
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade: string;
    estado: string;
    cep: string;
    // Dados registrais
    matricula?: string;
    cartorio?: string;
    cib?: string;
    inscricaoMunicipal?: string;
    // Características físicas
    areaTotal?: string;
    areaUtil?: string;
    descricaoCompleta?: string;
    tipoImovel?: 'residencial' | 'comercial' | 'misto';
    fracaoLabel?: string;
    fracaoArea?: number | null;
  };

  // ===== VALORES E CONDIÇÕES =====
  valores: {
    aluguel: string;
    aluguelExtenso?: string;
    condominio?: string;
    iptu?: string;
    iptuForma?: 'anual' | 'mensal' | 'parcelado';
    taxaIncendio?: string;
    outrasDispesas?: string;
  };

  // ===== PRAZO E REAJUSTE =====
  prazo: {
    meses: string;
    mesesExtenso?: string;
    dataInicio: string;
    dataFim: string;
    diaVencimento: string;
    indiceReajuste: 'IGPM' | 'IPCA' | 'INPC' | 'INCC';
    dataBaseReajuste?: string;
  };

  // ===== MULTAS E PENALIDADES =====
  penalidades: {
    multaAtraso: string; // percentual
    jurosMora: string; // percentual ao mês
    multaRescisoria: string; // quantidade de aluguéis
    multaInfracional?: string;
  };

  // ===== GARANTIA =====
  garantia: {
    tipo: GuaranteeType;
    fiador?: GuarantorData;
    caucao?: DepositData;
    seguroFianca?: InsuranceData;
  };

  // ===== ADMINISTRADORA (OPCIONAL) =====
  administradora?: {
    nome: string;
    cnpj: string;
    creci?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    taxaAdministracao: string;
  };

  // ===== DADOS DA ASSINATURA =====
  assinatura: {
    cidade: string;
    data: string;
  };

  // ===== OBSERVAÇÕES ADICIONAIS =====
  observacoes?: string;
}

// ============================================================================
// CLÁUSULAS DE GARANTIA ESPECÍFICAS (Lei 8.245/91, Art. 37)
// ============================================================================

const CLAUSULA_GARANTIA_FIADOR = `
CLÁUSULA VI – DA GARANTIA: FIANÇA (Art. 37, II da Lei 8.245/91)

6.1. Como garantia das obrigações assumidas neste contrato, apresenta-se como FIADOR(A) e principal pagador(a), nos termos dos artigos 818 a 839 do Código Civil Brasileiro:

FIADOR(A): {{fiador_nome}}, {{fiador_nacionalidade}}, {{fiador_estado_civil}}, {{fiador_profissao}}, inscrito(a) no CPF sob o nº {{fiador_cpf}}, RG nº {{fiador_rg}}, residente e domiciliado(a) à {{fiador_endereco}}, {{fiador_cidade}}/{{fiador_estado}}.

{{fiador_conjuge_clausula}}

6.2. O(A) FIADOR(A), neste ato, renuncia expressamente ao benefício de ordem previsto no artigo 827 do Código Civil, obrigando-se como principal pagador(a) e devedor(a) solidário(a) de todas as obrigações assumidas pelo(a) LOCATÁRIO(A).

6.3. A fiança ora prestada abrange:
   I. Os aluguéis vencidos e vincendos até a efetiva desocupação e entrega das chaves;
   II. Todos os encargos da locação (condomínio, IPTU, taxas, seguros);
   III. Multas moratórias e compensatórias;
   IV. Juros de mora e correção monetária;
   V. Eventuais danos causados ao imóvel;
   VI. Honorários advocatícios de 20% (vinte por cento) em caso de cobrança judicial;
   VII. Custas processuais e despesas de execução.

6.4. A fiança se estende até a efetiva entrega das chaves, mesmo que a locação se prorrogue por prazo indeterminado, nos termos do artigo 39 da Lei 8.245/91, ficando desde já o(a) FIADOR(A) ciente desta extensão.

6.5. Em garantia adicional, o(A) FIADOR(A) apresenta como patrimônio o seguinte imóvel:
   Endereço: {{fiador_imovel_endereco}}
   Matrícula nº {{fiador_imovel_matricula}} do {{fiador_imovel_cartorio}}
   Valor estimado: {{fiador_imovel_valor}}

6.6. Permanecendo a fiança com o mesmo FIADOR(A), esta deverá ser renovada mediante comprovação de idoneidade financeira a cada 12 (doze) meses, sob pena de o(a) LOCADOR(A) exigir a substituição da garantia.

6.7. Em caso de falecimento, incapacidade, recuperação judicial ou falência do(a) FIADOR(A), o(a) LOCATÁRIO(A) terá o prazo de 30 (trinta) dias para apresentar nova garantia, sob pena de caracterizar infração contratual.
`;

const CLAUSULA_GARANTIA_FIADOR_CONJUGE = `
CÔNJUGE DO(A) FIADOR(A): {{fiador_conjuge_nome}}, inscrito(a) no CPF sob o nº {{fiador_conjuge_cpf}}, RG nº {{fiador_conjuge_rg}}, que também assina o presente como FIADOR(A) e principal pagador(a) solidário(a), com expressa outorga uxória/marital para a prestação desta fiança, nos termos do artigo 1.647, III do Código Civil.
`;

const CLAUSULA_GARANTIA_CAUCAO = `
CLÁUSULA VI – DA GARANTIA: CAUÇÃO EM DINHEIRO (Art. 37, I e Art. 38 da Lei 8.245/91)

6.1. A título de caução, o(a) LOCATÁRIO(A) deposita neste ato a quantia de {{caucao_valor_formatado}}, equivalente a {{caucao_quantidade_alugueis}} aluguéis, observado o limite legal máximo de 3 (três) meses de aluguel estabelecido no artigo 38, §2º da Lei 8.245/91.

6.2. A caução foi depositada em:
   Forma de pagamento: {{caucao_forma_pagamento}}
   Data do depósito: {{caucao_data_deposito}}
   {{caucao_conta_info}}

6.3. Nos termos do artigo 38, §2º da Lei 8.245/91, a caução em dinheiro deverá ser depositada em caderneta de poupança, autorizada pelo Poder Público, revertendo em benefício do(a) LOCATÁRIO(A) os rendimentos auferidos.

6.4. A caução responde por todas as obrigações do(a) LOCATÁRIO(A), incluindo:
   I. Aluguéis e encargos em atraso;
   II. Multas moratórias e compensatórias;
   III. Danos ao imóvel apurados na vistoria de saída;
   IV. Diferenças de contas de consumo (água, luz, gás);
   V. Despesas de condomínio inadimplidas;
   VI. Custas e honorários advocatícios em caso de cobrança.

6.5. Finda a locação e restituído o imóvel em perfeito estado, conforme Laudo de Vistoria Final, o valor da caução será devolvido ao(à) LOCATÁRIO(A) em até 30 (trinta) dias, acrescido dos rendimentos da poupança, descontados eventuais débitos pendentes.

6.6. Se o valor da caução for insuficiente para cobrir os débitos apurados, o(a) LOCATÁRIO(A) responderá pela diferença.

6.7. A liberação da caução está condicionada à comprovação de quitação de todas as contas de consumo e encargos de condomínio.
`;

const CLAUSULA_GARANTIA_SEGURO_FIANCA = `
CLÁUSULA VI – DA GARANTIA: SEGURO DE FIANÇA LOCATÍCIA (Art. 37, III da Lei 8.245/91)

6.1. Como garantia das obrigações contratuais, o(a) LOCATÁRIO(A) apresenta Seguro de Fiança Locatícia contratado junto à:

   Seguradora: {{seguro_seguradora}}
   Apólice nº: {{seguro_apolice}}
   Vigência: {{seguro_vigencia}}
   Valor da cobertura: {{seguro_valor_cobertura}}
   Prêmio: {{seguro_premio}}

6.2. O Seguro de Fiança Locatícia garante ao(à) LOCADOR(A):
   I. Pagamento dos aluguéis vencidos e não pagos;
   II. Encargos legais da locação (IPTU, condomínio, taxas);
   III. Danos ao imóvel locado, devidamente comprovados;
   IV. Multa por rescisão antecipada;
   V. Pintura e reparos conforme vistoria;
   VI. Custas judiciais e honorários advocatícios.

6.3. O(A) LOCATÁRIO(A) obriga-se a manter a apólice em vigor durante toda a vigência do contrato e suas prorrogações, devendo comprovar a renovação com antecedência mínima de 30 (trinta) dias antes do vencimento.

6.4. O não pagamento do prêmio do seguro ou a não renovação da apólice caracteriza INFRAÇÃO CONTRATUAL, autorizando o(a) LOCADOR(A) a exigir a substituição da garantia no prazo de 30 (trinta) dias ou a rescisão do contrato.

6.5. Em caso de sinistro, o(a) LOCADOR(A) poderá acionar diretamente a seguradora, sem necessidade de prévia execução contra o(a) LOCATÁRIO(A).

6.6. A contratação do seguro não exime o(a) LOCATÁRIO(A) da responsabilidade por valores que excedam a cobertura da apólice.
`;

const CLAUSULA_SEM_GARANTIA = `
CLÁUSULA VI – DA AUSÊNCIA DE GARANTIA

6.1. O presente contrato é celebrado SEM GARANTIA LOCATÍCIA, por expressa dispensa do(a) LOCADOR(A).

6.2. Nesta hipótese, nos termos do artigo 42 da Lei 8.245/91, o(a) LOCADOR(A) poderá exigir o pagamento antecipado do aluguel mensal, no início de cada período de competência.

6.3. O(A) LOCATÁRIO(A) declara estar ciente de que o inadimplemento de qualquer parcela do aluguel autoriza o(a) LOCADOR(A) a requerer liminar de despejo, nos termos do artigo 59, §1º, IX da Lei 8.245/91.
`;

// ============================================================================
// GERADOR DE CONTRATO DINÂMICO
// ============================================================================

export function generateRentalContract(data: FullContractData): string {
  const tipoImovel = data.imovel.tipoImovel === 'comercial' ? 'COMERCIAL' : 'RESIDENCIAL';
  
  // Format values with extension using the new utility
  const aluguelFormatado = formatValueWithExtension(data.valores.aluguel);
  const caucaoFormatado = data.garantia.caucao?.valor 
    ? formatValueWithExtension(data.garantia.caucao.valor)
    : '____________________';
  
  // Calculate caucao quantity in months
  const aluguelNumerico = parseBRLCurrency(data.valores.aluguel);
  const caucaoNumerico = data.garantia.caucao?.valor 
    ? parseBRLCurrency(data.garantia.caucao.valor) 
    : 0;
  const caucaoMeses = aluguelNumerico > 0 
    ? Math.round(caucaoNumerico / aluguelNumerico) 
    : 3;
  
  // Seleciona a cláusula de garantia apropriada
  let clausulaGarantia = '';
  switch (data.garantia.tipo) {
    case 'fiador':
      clausulaGarantia = CLAUSULA_GARANTIA_FIADOR;
      if (data.garantia.fiador?.conjuge) {
        clausulaGarantia = clausulaGarantia.replace(
          '{{fiador_conjuge_clausula}}',
          CLAUSULA_GARANTIA_FIADOR_CONJUGE
        );
      } else {
        clausulaGarantia = clausulaGarantia.replace('{{fiador_conjuge_clausula}}', '');
      }
      break;
    case 'caucao':
      clausulaGarantia = CLAUSULA_GARANTIA_CAUCAO
        .replace('{{caucao_valor_formatado}}', caucaoFormatado)
        .replace('{{caucao_quantidade_alugueis}}', `${caucaoMeses} (${numberToWords(caucaoMeses)})`)
        .replace('{{caucao_forma_pagamento}}', data.garantia.caucao?.formaPagamento === 'transferencia' 
          ? 'Transferência bancária' 
          : data.garantia.caucao?.formaPagamento === 'cheque' 
            ? 'Cheque' 
            : 'Dinheiro')
        .replace('{{caucao_data_deposito}}', data.garantia.caucao?.dataDeposito || 'na assinatura deste contrato')
        .replace('{{caucao_conta_info}}', data.garantia.caucao?.contaDeposito 
          ? `Conta de depósito: ${data.garantia.caucao.contaDeposito}` 
          : '');
      break;
    case 'seguro_fianca':
      clausulaGarantia = CLAUSULA_GARANTIA_SEGURO_FIANCA;
      break;
    default:
      clausulaGarantia = CLAUSULA_SEM_GARANTIA;
  }

  // Monta cláusula do cônjuge do locador se existir
  const locadorConjugeTexto = data.locador.conjuge 
    ? `, casado(a) com ${data.locador.conjuge.nome}, CPF nº ${data.locador.conjuge.cpf}${data.locador.conjuge.rg ? `, RG nº ${data.locador.conjuge.rg}` : ''}` 
    : '';

  // Monta cláusula do cônjuge do locatário se existir
  const locatarioConjugeTexto = data.locatario.conjuge 
    ? `, casado(a) com ${data.locatario.conjuge.nome}, CPF nº ${data.locatario.conjuge.cpf}${data.locatario.conjuge.rg ? `, RG nº ${data.locatario.conjuge.rg}` : ''}` 
    : '';

  // Prazo por extenso
  const prazoMeses = parseInt(data.prazo.meses) || 30;
  const prazoExtenso = data.prazo.mesesExtenso || numberToWords(prazoMeses);

  // Monta texto de administradora se existir
  const administradoraTexto = data.administradora ? `

CLÁUSULA XII – DA ADMINISTRAÇÃO

12.1. O presente contrato é administrado por ${data.administradora.nome}, pessoa jurídica inscrita no CNPJ sob o nº ${data.administradora.cnpj}${data.administradora.creci ? `, CRECI nº ${data.administradora.creci}` : ''}.

12.2. A administradora está autorizada a receber, em nome do(a) LOCADOR(A), os aluguéis e encargos da locação, dar quitação, representar o(a) LOCADOR(A) perante o(a) LOCATÁRIO(A) e terceiros, bem como praticar todos os atos de gestão ordinária necessários à boa execução deste contrato.

12.3. Pelos serviços de administração, será devida a taxa de ${data.administradora.taxaAdministracao}% (${numberToWords(parseFloat(data.administradora.taxaAdministracao))} por cento) sobre o valor do aluguel líquido.

12.4. As comunicações relativas a este contrato deverão ser dirigidas à administradora no endereço: ${data.administradora.endereco || 'conforme consta em seu cadastro'}.
` : '';

  const contract = `
████████████████████████████████████████████████████████████████████████████████
                    CONTRATO DE LOCAÇÃO ${tipoImovel}
                 Lei nº 8.245/91 – Lei do Inquilinato
████████████████████████████████████████████████████████████████████████████████

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      IDENTIFICAÇÃO DAS PARTES CONTRATANTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**LOCADOR(A)/PROPRIETÁRIO(A):** ${data.locador.nome}, ${data.locador.nacionalidade || 'brasileiro(a)'}, ${data.locador.estadoCivil || 'estado civil não informado'}${locadorConjugeTexto}, ${data.locador.profissao || 'profissão não informada'}, inscrito(a) no CPF sob o nº ${data.locador.cpf}${data.locador.rg ? `, RG nº ${data.locador.rg}` : ''}, residente e domiciliado(a) à ${data.locador.endereco}, ${data.locador.cidade}/${data.locador.estado}${data.locador.cep ? `, CEP ${data.locador.cep}` : ''}${data.locador.email ? `, e-mail: ${data.locador.email}` : ''}${data.locador.telefone ? `, telefone: ${data.locador.telefone}` : ''}, doravante denominado(a) simplesmente **LOCADOR(A)**.

**LOCATÁRIO(A)/INQUILINO(A):** ${data.locatario.nome}, ${data.locatario.nacionalidade || 'brasileiro(a)'}, ${data.locatario.estadoCivil || 'estado civil não informado'}${locatarioConjugeTexto}, ${data.locatario.profissao || 'profissão não informada'}, inscrito(a) no CPF sob o nº ${data.locatario.cpf}${data.locatario.rg ? `, RG nº ${data.locatario.rg}` : ''}, residente e domiciliado(a) à ${data.locatario.endereco}, ${data.locatario.cidade}/${data.locatario.estado}${data.locatario.cep ? `, CEP ${data.locatario.cep}` : ''}${data.locatario.email ? `, e-mail: ${data.locatario.email}` : ''}${data.locatario.telefone ? `, telefone: ${data.locatario.telefone}` : ''}, doravante denominado(a) simplesmente **LOCATÁRIO(A)**.

As partes acima identificadas, neste ato denominadas simplesmente LOCADOR(A) e LOCATÁRIO(A), têm entre si justo e acertado o presente **CONTRATO DE LOCAÇÃO ${tipoImovel}**, que se regerá pelas cláusulas e condições a seguir estipuladas, bem como pelas disposições da **Lei nº 8.245, de 18 de outubro de 1991** (Lei do Inquilinato) e demais legislações aplicáveis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                CLÁUSULA I – DO OBJETO DA LOCAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1.1. O presente contrato tem por **OBJETO** a locação do imóvel situado à **${data.imovel.endereco}${data.imovel.numero ? `, nº ${data.imovel.numero}` : ''}${data.imovel.complemento ? `, ${data.imovel.complemento}` : ''}**, Bairro ${data.imovel.bairro || 'não informado'}, na cidade de **${data.imovel.cidade}/${data.imovel.estado}**, CEP ${data.imovel.cep}.

1.2. **DESCRIÇÃO REGISTRAL:** O imóvel encontra-se regularmente registrado sob a **Matrícula nº ${data.imovel.matricula || '_______________'}**, junto ao **${data.imovel.cartorio || 'Cartório de Registro de Imóveis competente'}**${data.imovel.cib ? `, CIB/Inscrição Imobiliária nº ${data.imovel.cib}` : ''}${data.imovel.inscricaoMunicipal ? `, Inscrição Municipal nº ${data.imovel.inscricaoMunicipal}` : ''}.

1.3. **CARACTERÍSTICAS FÍSICAS:** ${data.imovel.descricaoCompleta || `Imóvel com área total de ${data.imovel.areaTotal || '___'} m²${data.imovel.areaUtil ? ` e área útil de ${data.imovel.areaUtil} m²` : ''}.`}

1.4. **FINALIDADE:** O imóvel destina-se **exclusivamente** ao uso ${tipoImovel.toLowerCase()} do(a) LOCATÁRIO(A)${data.imovel.tipoImovel === 'residencial' ? ' e sua família' : ''}, sendo **vedado** o uso para atividade diversa da convencionada, sob pena de caracterizar infração contratual.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                CLÁUSULA II – DA PROIBIÇÃO DE SUBLOCAÇÃO
                        (Art. 13 da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1. É **EXPRESSAMENTE VEDADO** ao(à) LOCATÁRIO(A):

   I. Sublocar, total ou parcialmente, o imóvel locado;
   II. Ceder ou transferir a locação a terceiros;
   III. Emprestar o imóvel;
   IV. Permitir a permanência de pessoas estranhas ao contrato por período superior a 30 (trinta) dias consecutivos, sem prévia e expressa autorização por escrito do(a) LOCADOR(A).

2.2. A infração a qualquer das vedações acima constitui **INFRAÇÃO GRAVE** e autoriza a imediata rescisão contratual, nos termos do artigo 9º, II da Lei 8.245/91, independentemente de notificação prévia.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              CLÁUSULA III – DO PRAZO DA LOCAÇÃO
                  (Arts. 46 e 47 da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1. A presente locação é celebrada pelo prazo **DETERMINADO** de **${data.prazo.meses} (${prazoExtenso}) meses**, com início em **${data.prazo.dataInicio}** e término em **${data.prazo.dataFim}**.

3.2. Na data do término, o(a) LOCATÁRIO(A) obriga-se a **RESTITUIR O IMÓVEL** completamente desocupado, limpo e nas mesmas condições em que o recebeu, conforme descrito no **LAUDO DE VISTORIA INICIAL**, que integra o presente contrato como Anexo I.

3.3. **PRORROGAÇÃO AUTOMÁTICA:** Findo o prazo estipulado, se o(a) LOCATÁRIO(A) continuar na posse do imóvel por mais de 30 (trinta) dias sem oposição do(a) LOCADOR(A), presumir-se-á prorrogada a locação por prazo **INDETERMINADO**, mantidas as demais cláusulas e condições deste contrato (Art. 46, §1º da Lei 8.245/91).

3.4. **DENÚNCIA VAZIA:** Prorrogada a locação por prazo indeterminado, o(a) LOCADOR(A) poderá denunciar o contrato, concedendo ao(à) LOCATÁRIO(A) o prazo de 30 (trinta) dias para desocupação, findo o qual será ajuizada a competente ação de despejo (Art. 46, §2º da Lei 8.245/91).

3.5. **COMUNICAÇÃO DE SAÍDA:** O(A) LOCATÁRIO(A) deverá comunicar ao(à) LOCADOR(A), por escrito, sua intenção de não renovar o contrato ou de desocupar o imóvel com antecedência mínima de **30 (trinta) dias**.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CLÁUSULA IV – DO ALUGUEL E ENCARGOS DA LOCAÇÃO
                      (Arts. 22 e 23 da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1. O valor do **ALUGUEL MENSAL** é de **${aluguelFormatado}**, a ser pago **ATÉ O DIA ${data.prazo.diaVencimento}** de cada mês subsequente ao vencido.

4.2. O pagamento deverá ser efetuado mediante:
   □ Boleto bancário enviado pela administradora
   □ Depósito/Transferência na conta indicada pelo(a) LOCADOR(A)
   □ PIX para a chave cadastrada

   **Dados para pagamento:** A definir conforme orientação do(a) LOCADOR(A)/Administradora

4.3. **ENCARGOS DA LOCAÇÃO:** Além do aluguel, correrão por conta **EXCLUSIVA** do(a) LOCATÁRIO(A) as seguintes despesas:

   **a) CONDOMÍNIO:** R$ ${data.valores.condominio || '____'} mensais (valor estimado, sujeito a variação conforme rateio);
   
   **b) IPTU:** R$ ${data.valores.iptu || '____'} ${data.valores.iptuForma === 'anual' ? 'anuais' : data.valores.iptuForma === 'mensal' ? 'mensais' : 'conforme parcelamento municipal'};
   
   **c) SEGURO CONTRA INCÊNDIO:** Conforme apólice a ser contratada pelo(a) LOCATÁRIO(A);
   
   **d) CONSUMO:** Taxas e tarifas de água, energia elétrica, gás, telefone, internet e demais serviços;
   
   **e) TAXA DE LIXO E OUTRAS:** Taxas municipais incidentes sobre o imóvel.

4.4. O(A) LOCATÁRIO(A) obriga-se a apresentar mensalmente os comprovantes de pagamento dos encargos acima quando solicitado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                CLÁUSULA V – DO REAJUSTE DO ALUGUEL
                     (Art. 18 da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1. O aluguel será **REAJUSTADO ANUALMENTE**, na data de aniversário deste contrato (${data.prazo.dataBaseReajuste || data.prazo.dataInicio}), pela variação acumulada do índice **${data.prazo.indiceReajuste}** (${getIndiceName(data.prazo.indiceReajuste)}) nos últimos 12 (doze) meses anteriores à data-base.

5.2. Na hipótese de extinção do índice pactuado, será utilizado o índice que vier a substituí-lo oficialmente ou, na ausência deste, o **IPCA** (Índice de Preços ao Consumidor Amplo), divulgado pelo IBGE.

5.3. O(A) LOCATÁRIO(A) declara estar ciente de que a aplicação do reajuste é **AUTOMÁTICA**, independendo de notificação prévia, devendo o aluguel do mês de aniversário já ser pago com o novo valor.

5.4. A qualquer das partes é facultado, a cada período de 3 (três) anos, requerer a revisão judicial do aluguel, a fim de ajustá-lo ao preço de mercado (Art. 19 da Lei 8.245/91).

${clausulaGarantia}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              CLÁUSULA VII – DA VISTORIA E ESTADO DO IMÓVEL
                       (Art. 22, V da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7.1. O imóvel é entregue ao(à) LOCATÁRIO(A) nas condições descritas no **LAUDO DE VISTORIA INICIAL**, o qual, assinado pelas partes, passa a fazer parte integrante deste contrato.

7.2. O(A) LOCATÁRIO(A) declara ter examinado o imóvel previamente, recebendo-o em **perfeito estado de conservação**, com instalações elétricas, hidráulicas, sanitárias e de gás em pleno funcionamento, vidros íntegros, paredes limpas e pintadas, pisos em bom estado, fechaduras e chaves funcionando.

7.3. Finda a locação, será realizada **VISTORIA FINAL** para comparação com o estado inicial. As divergências que configurem danos além do desgaste natural serão de responsabilidade do(a) LOCATÁRIO(A).

7.4. O(A) LOCATÁRIO(A) obriga-se a devolver o imóvel com:
   I. Pintura em perfeito estado, na mesma cor e padrão originais;
   II. Todos os vidros íntegros;
   III. Instalações elétricas e hidráulicas funcionando;
   IV. Pisos, azulejos e revestimentos sem danos;
   V. Áreas externas limpas e jardins (se houver) conservados.

7.5. Os reparos necessários deverão ser executados pelo(a) LOCATÁRIO(A) **ANTES DA ENTREGA DAS CHAVES**, sob pena de desconto do valor correspondente da garantia ou cobrança suplementar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CLÁUSULA VIII – DAS OBRIGAÇÕES DO LOCADOR
                      (Art. 22 da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8.1. O(A) LOCADOR(A) obriga-se a:

   I. Entregar ao(à) LOCATÁRIO(A) o imóvel em estado de servir ao uso a que se destina;
   II. Garantir, durante a locação, o uso pacífico do imóvel;
   III. Manter a forma e o destino do imóvel locado;
   IV. Responder pelos vícios ou defeitos anteriores à locação;
   V. Fornecer ao(à) LOCATÁRIO(A), caso solicitado, descrição minuciosa do estado do imóvel;
   VI. Pagar as taxas de administração imobiliária e de intermediação;
   VII. Pagar as despesas extraordinárias de condomínio;
   VIII. Pagar os impostos e taxas que incidam sobre o imóvel (salvo IPTU, de responsabilidade do LOCATÁRIO).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CLÁUSULA IX – DAS OBRIGAÇÕES DO LOCATÁRIO
                      (Art. 23 da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9.1. O(A) LOCATÁRIO(A) obriga-se a:

   I. Pagar **PONTUALMENTE** o aluguel e encargos nos prazos estipulados;
   II. Servir-se do imóvel para o uso convencionado e de maneira compatível com sua natureza;
   III. Restituir o imóvel, finda a locação, no estado em que o recebeu;
   IV. Levar ao conhecimento do(a) LOCADOR(A) qualquer dano ou defeito de que tenha ciência;
   V. Realizar reparos dos danos causados por si, familiares, dependentes ou prepostos;
   VI. **NÃO MODIFICAR** a forma interna ou externa do imóvel sem consentimento prévio e por escrito;
   VII. Entregar ao(à) LOCADOR(A) os documentos de cobrança de encargos que lhe forem entregues;
   VIII. Pagar as despesas de consumo (água, luz, gás);
   IX. Permitir a vistoria do imóvel pelo(a) LOCADOR(A) ou seu representante, mediante combinação prévia;
   X. Cumprir as normas do condomínio e da legislação municipal.

9.2. **BENFEITORIAS:** As benfeitorias, sejam úteis, necessárias ou voluptuárias, realizadas no imóvel sem prévia autorização por escrito do(a) LOCADOR(A), serão **INCORPORADAS AO IMÓVEL**, sem direito a indenização ou retenção, salvo acordo expresso em contrário.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     CLÁUSULA X – DAS MULTAS E PENALIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10.1. **MULTA MORATÓRIA (ATRASO NO PAGAMENTO):**
   O atraso no pagamento do aluguel ou encargos acarretará:
   • Multa de **${data.penalidades.multaAtraso}%** (${numberToWords(parseFloat(data.penalidades.multaAtraso))} por cento) sobre o valor devido;
   • Juros de mora de **${data.penalidades.jurosMora}%** (${numberToWords(parseFloat(data.penalidades.jurosMora))} por cento) **ao mês**, calculados pro rata die;
   • Correção monetária pelo índice ${data.prazo.indiceReajuste} a partir do vencimento.

10.2. **MULTA POR INFRAÇÃO CONTRATUAL:**
   A infração de qualquer cláusula deste contrato sujeitará o infrator ao pagamento de multa equivalente a **${data.penalidades.multaRescisoria} (${numberToWords(parseInt(data.penalidades.multaRescisoria))}) aluguéis** vigentes à época da infração, sem prejuízo:
   • Das demais cominações legais;
   • Da rescisão imediata do contrato;
   • Da cobrança de perdas e danos;
   • Dos honorários advocatícios de 20% sobre o valor da causa.

10.3. **MULTA POR RESCISÃO ANTECIPADA PELO LOCATÁRIO:**
   Caso o(a) LOCATÁRIO(A) restitua o imóvel antes do termo do contrato, pagará multa compensatória de ${data.penalidades.multaRescisoria} (${numberToWords(parseInt(data.penalidades.multaRescisoria))}) aluguéis, **PROPORCIONAL AO PERÍODO RESTANTE**, nos termos do artigo 4º da Lei 8.245/91.

   **Fórmula de cálculo:**
   Multa = (Multa Total ÷ Prazo Total em meses) × Meses restantes

   *Exemplo: Para contrato de 30 meses com multa de 3 aluguéis, desocupando no 20º mês:*
   *Multa = (3 ÷ 30) × 10 = 1 aluguel de multa*

10.4. **ISENÇÃO DE MULTA POR TRANSFERÊNCIA:** Nos termos do artigo 4º, parágrafo único da Lei 8.245/91, fica **ISENTO** da multa por rescisão antecipada o(a) LOCATÁRIO(A) que, em decorrência de transferência pelo empregador, for residir em localidade diversa, desde que notifique por escrito o(a) LOCADOR(A) com antecedência mínima de 30 (trinta) dias.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CLÁUSULA XI – DA RESCISÃO E DESPEJO
                  (Arts. 9º e 59 da Lei 8.245/91)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

11.1. A locação poderá ser **RESCINDIDA DE PLENO DIREITO**, independentemente de interpelação judicial ou extrajudicial:

   I. Por mútuo acordo entre as partes;
   II. Por infração legal ou contratual;
   III. Por falta de pagamento de aluguel e demais encargos;
   IV. Para realização de reparações urgentes determinadas pelo Poder Público;
   V. Nos demais casos previstos na Lei 8.245/91.

11.2. **DESPEJO LIMINAR:** O(A) LOCADOR(A) poderá requerer liminar de despejo, nos termos do artigo 59, §1º da Lei 8.245/91, nos casos de:
   I. Descumprimento de acordo no curso da ação de despejo;
   II. Falta de pagamento de aluguel por mais de 3 (três) meses;
   III. Infração contratual grave;
   IV. Ausência de garantia ou sua perda.

11.3. A imissão na posse do imóvel pelo(a) LOCADOR(A) não exime o(a) LOCATÁRIO(A) do pagamento de aluguéis vencidos, encargos, multas e reparos devidos.

${administradoraTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                CLÁUSULA XIII – DAS DISPOSIÇÕES GERAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

13.1. O(A) LOCATÁRIO(A) renuncia expressamente ao direito de invocar benfeitorias como fundamento para retenção do imóvel.

13.2. A tolerância de qualquer das partes quanto ao descumprimento de cláusula deste contrato não implicará novação ou renúncia de direito.

13.3. As partes elegem o **correio eletrônico (e-mail)** e o **aplicativo WhatsApp** como meios válidos de comunicação para todos os efeitos deste contrato, equivalendo a notificação por escrito.

13.4. Este contrato obriga as partes e seus sucessores a qualquer título.

13.5. Os casos omissos serão regidos pela Lei 8.245/91 e subsidiariamente pelo Código Civil Brasileiro.

${data.observacoes ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     OBSERVAÇÕES E CONDIÇÕES ESPECIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.observacoes}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                CLÁUSULA XIV – DO FORO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fica eleito o **FORO DA COMARCA DE ${data.imovel.cidade.toUpperCase()}/${data.imovel.estado.toUpperCase()}** para dirimir quaisquer dúvidas oriundas do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

E por estarem assim justos e contratados, firmam o presente instrumento em **02 (duas) vias** de igual teor e forma, na presença de 02 (duas) testemunhas, para que produza seus efeitos legais.

**${data.assinatura.cidade}, ${data.assinatura.data}.**


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                              ASSINATURAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


_____________________________________________
**LOCADOR(A):** ${data.locador.nome}
CPF: ${data.locador.cpf}
${data.locador.conjuge ? `

_____________________________________________
**CÔNJUGE DO LOCADOR(A):** ${data.locador.conjuge.nome}
CPF: ${data.locador.conjuge.cpf}
` : ''}

_____________________________________________
**LOCATÁRIO(A):** ${data.locatario.nome}
CPF: ${data.locatario.cpf}
${data.locatario.conjuge ? `

_____________________________________________
**CÔNJUGE DO LOCATÁRIO(A):** ${data.locatario.conjuge.nome}
CPF: ${data.locatario.conjuge.cpf}
` : ''}
${data.garantia.tipo === 'fiador' && data.garantia.fiador ? `

_____________________________________________
**FIADOR(A):** ${data.garantia.fiador.nome}
CPF: ${data.garantia.fiador.cpf}
${data.garantia.fiador.conjuge ? `

_____________________________________________
**CÔNJUGE DO FIADOR(A):** ${data.garantia.fiador.conjuge.nome}
CPF: ${data.garantia.fiador.conjuge.cpf}
` : ''}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                             TESTEMUNHAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. _____________________________________________
   Nome: ________________________________________
   CPF: _________________________________________

2. _____________________________________________
   Nome: ________________________________________
   CPF: _________________________________________


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                               ANEXOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ANEXO I** – Laudo de Vistoria Inicial do Imóvel
**ANEXO II** – Cópia do documento de identidade das partes
**ANEXO III** – Comprovante de endereço das partes
${data.garantia.tipo === 'fiador' ? '**ANEXO IV** – Documentos do Fiador (RG, CPF, comprovante de renda e propriedade)' : ''}
${data.garantia.tipo === 'seguro_fianca' ? '**ANEXO IV** – Apólice do Seguro Fiança Locatícia' : ''}
${data.garantia.tipo === 'caucao' ? '**ANEXO IV** – Comprovante de depósito caução' : ''}
`;

  return contract;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// numberToWords is now imported from currencyUtils.ts

function getIndiceName(indice: string): string {
  const indices: Record<string, string> = {
    'IGPM': 'Índice Geral de Preços do Mercado',
    'IPCA': 'Índice Nacional de Preços ao Consumidor Amplo',
    'INPC': 'Índice Nacional de Preços ao Consumidor',
    'INCC': 'Índice Nacional de Custo da Construção'
  };
  return indices[indice] || indice;
}

// ============================================================================
// TEMPLATE LEGADO (MANTIDO PARA COMPATIBILIDADE)
// ============================================================================

export interface ContractAutoFillData {
  ownerName?: string;
  ownerCpf?: string;
  ownerAddress?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  tenantName?: string;
  tenantCpf?: string;
  tenantAddress?: string;
  tenantPhone?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyCep?: string;
  registrationNumber?: string;
  cibNumber?: string;
  propertyArea?: string;
  rentAmount?: string;
  condoFee?: string;
  iptuAmount?: string;
  leaseDuration?: string;
  startDate?: string;
  endDate?: string;
  dueDay?: string;
  adjustmentIndex?: string;
  guaranteeType?: string;
  guaranteeValue?: string;
  agencyName?: string;
  agencyCnpj?: string;
  adminFeePercentage?: string;
}

export function mapToContractVariables(data: ContractAutoFillData): Record<string, string> {
  const today = new Date();
  
  return {
    locador_nome: data.ownerName || '',
    locador_cpf: data.ownerCpf || '',
    locador_endereco: data.ownerAddress || '',
    locador_telefone: data.ownerPhone || '',
    vendedor_nome: data.ownerName || '',
    vendedor_cpf: data.ownerCpf || '',
    vendedor_endereco: data.ownerAddress || '',
    locatario_nome: data.tenantName || '',
    locatario_cpf: data.tenantCpf || '',
    locatario_endereco: data.tenantAddress || '',
    locatario_telefone: data.tenantPhone || '',
    comprador_nome: data.tenantName || '',
    comprador_cpf: data.tenantCpf || '',
    comprador_endereco: data.tenantAddress || '',
    imovel_endereco: data.propertyAddress || '',
    imovel_cidade: data.propertyCity || '',
    imovel_estado: data.propertyState || '',
    imovel_cep: data.propertyCep || '',
    matricula_numero: data.registrationNumber || '',
    cib_numero: data.cibNumber || '',
    area_total: data.propertyArea || '',
    valor_aluguel: data.rentAmount || '',
    valor_condominio: data.condoFee || '',
    valor_iptu: data.iptuAmount || '',
    prazo_meses: data.leaseDuration || '30',
    data_inicio: data.startDate || '',
    data_fim: data.endDate || '',
    dia_vencimento: data.dueDay || '10',
    indice_reajuste: data.adjustmentIndex || 'IGPM',
    garantia_tipo: data.guaranteeType || 'Caução',
    garantia_valor: data.guaranteeValue || '',
    administradora_nome: data.agencyName || '',
    administradora_cnpj: data.agencyCnpj || '',
    taxa_administracao: data.adminFeePercentage || '10',
    data_contrato: today.toLocaleDateString('pt-BR'),
    cidade_contrato: data.propertyCity || '',
  };
}

/**
 * Converte dados do sistema legado para o formato completo do contrato
 */
export function convertLegacyToFullContract(
  legacyData: ContractAutoFillData,
  guaranteeType: GuaranteeType = 'caucao',
  guaranteeDetails?: GuarantorData | DepositData | InsuranceData
): FullContractData {
  const today = new Date();
  
  return {
    locador: {
      nome: legacyData.ownerName || '',
      cpf: legacyData.ownerCpf || '',
      endereco: legacyData.ownerAddress || '',
      cidade: legacyData.propertyCity || '',
      estado: legacyData.propertyState || '',
      telefone: legacyData.ownerPhone,
      email: legacyData.ownerEmail,
    },
    locatario: {
      nome: legacyData.tenantName || '',
      cpf: legacyData.tenantCpf || '',
      endereco: legacyData.tenantAddress || '',
      cidade: legacyData.propertyCity || '',
      estado: legacyData.propertyState || '',
      telefone: legacyData.tenantPhone,
    },
    imovel: {
      endereco: legacyData.propertyAddress || '',
      cidade: legacyData.propertyCity || '',
      estado: legacyData.propertyState || '',
      cep: legacyData.propertyCep || '',
      matricula: legacyData.registrationNumber,
      cib: legacyData.cibNumber,
      areaTotal: legacyData.propertyArea,
      tipoImovel: 'residencial',
    },
    valores: {
      aluguel: legacyData.rentAmount || '',
      condominio: legacyData.condoFee,
      iptu: legacyData.iptuAmount,
    },
    prazo: {
      meses: legacyData.leaseDuration || '30',
      dataInicio: legacyData.startDate || today.toLocaleDateString('pt-BR'),
      dataFim: legacyData.endDate || '',
      diaVencimento: legacyData.dueDay || '10',
      indiceReajuste: (legacyData.adjustmentIndex as 'IGPM' | 'IPCA' | 'INPC' | 'INCC') || 'IGPM',
    },
    penalidades: {
      multaAtraso: '10',
      jurosMora: '1',
      multaRescisoria: '3',
    },
    garantia: {
      tipo: guaranteeType,
      ...(guaranteeType === 'fiador' && guaranteeDetails ? { fiador: guaranteeDetails as GuarantorData } : {}),
      ...(guaranteeType === 'caucao' && guaranteeDetails ? { caucao: guaranteeDetails as DepositData } : {}),
      ...(guaranteeType === 'seguro_fianca' && guaranteeDetails ? { seguroFianca: guaranteeDetails as InsuranceData } : {}),
    },
    administradora: legacyData.agencyName ? {
      nome: legacyData.agencyName,
      cnpj: legacyData.agencyCnpj || '',
      taxaAdministracao: legacyData.adminFeePercentage || '10',
    } : undefined,
    assinatura: {
      cidade: legacyData.propertyCity || '',
      data: today.toLocaleDateString('pt-BR'),
    },
  };
}

// ============================================================================
// TEMPLATES PARA O EDITOR DE DOCUMENTOS (COMPATIBILIDADE)
// ============================================================================

export const RENTAL_CONTRACT_TEMPLATE: LegalTemplate = {
  id: 'contrato-locacao-residencial-lei8245',
  name: 'Contrato de Locação Residencial (Lei 8.245/91)',
  type: 'rental',
  description: 'Contrato robusto baseado na Lei do Inquilinato, com cláusulas de garantia, vistoria, multas e rescisão.',
  variables: [
    'locador_nome', 'locador_cpf', 'locador_endereco', 'locador_telefone', 'locador_email',
    'locatario_nome', 'locatario_cpf', 'locatario_endereco', 'locatario_telefone',
    'imovel_endereco', 'imovel_cidade', 'imovel_estado', 'imovel_cep', 'imovel_bairro',
    'matricula_numero', 'cib_numero', 'area_total', 'cartorio',
    'valor_aluguel', 'valor_condominio', 'valor_iptu',
    'prazo_meses', 'data_inicio', 'data_fim', 'dia_vencimento', 'indice_reajuste',
    'garantia_tipo', 'multa_atraso', 'juros_mora', 'multa_rescisoria',
    'administradora_nome', 'administradora_cnpj', 'taxa_administracao',
    'data_contrato', 'cidade_contrato'
  ],
  content: `Este modelo de contrato será gerado dinamicamente pela função generateRentalContract(). 
Acesse o ContractGeneratorDialog para gerar o contrato completo com todas as cláusulas da Lei 8.245/91.`
};

export const SALE_CONTRACT_TEMPLATE: LegalTemplate = {
  id: 'contrato-compra-venda',
  name: 'Compromisso de Compra e Venda',
  type: 'sale',
  description: 'Contrato preliminar de compra e venda de imóvel.',
  variables: [
    'vendedor_nome', 'vendedor_cpf', 'vendedor_endereco',
    'comprador_nome', 'comprador_cpf', 'comprador_endereco',
    'imovel_endereco', 'imovel_cidade', 'imovel_estado',
    'matricula_numero', 'cib_numero', 'area_total',
    'valor_total', 'valor_entrada', 'valor_financiado',
    'data_escritura', 'corretor_nome', 'creci_numero', 'taxa_comissao',
    'data_contrato', 'cidade_contrato'
  ],
  content: `
COMPROMISSO DE COMPRA E VENDA DE IMÓVEL

IDENTIFICAÇÃO DAS PARTES

PROMITENTE VENDEDOR(A): {{vendedor_nome}}, inscrito(a) no CPF sob o nº {{vendedor_cpf}}, residente e domiciliado(a) à {{vendedor_endereco}}, doravante denominado(a) simplesmente VENDEDOR(A).

PROMITENTE COMPRADOR(A): {{comprador_nome}}, inscrito(a) no CPF sob o nº {{comprador_cpf}}, residente e domiciliado(a) à {{comprador_endereco}}, doravante denominado(a) simplesmente COMPRADOR(A).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA PRIMEIRA – DO OBJETO

O presente instrumento tem por objeto o imóvel situado à {{imovel_endereco}}, {{imovel_cidade}} - {{imovel_estado}}, matriculado sob o nº {{matricula_numero}}, CIB nº {{cib_numero}}, com área total de {{area_total}} m².

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA SEGUNDA – DO PREÇO E FORMA DE PAGAMENTO

O preço total da venda é de R$ {{valor_total}}, a ser pago da seguinte forma:
a) Sinal/Entrada: R$ {{valor_entrada}} na assinatura deste compromisso;
b) Financiamento: R$ {{valor_financiado}} mediante aprovação de crédito bancário.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA TERCEIRA – DA ESCRITURA

A escritura definitiva de compra e venda será lavrada até {{data_escritura}}, após a quitação integral do preço e apresentação de toda documentação necessária.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA QUARTA – DA INTERMEDIAÇÃO

A presente transação foi intermediada por {{corretor_nome}}, CRECI nº {{creci_numero}}, sendo devida comissão de {{taxa_comissao}}% sobre o valor da venda.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA QUINTA – DO FORO

Fica eleito o foro da Comarca de {{imovel_cidade}}/{{imovel_estado}} para dirimir quaisquer dúvidas.

{{cidade_contrato}}, {{data_contrato}}.


_________________________________________
VENDEDOR(A): {{vendedor_nome}}


_________________________________________
COMPRADOR(A): {{comprador_nome}}
`
};

export const LEGAL_TEMPLATES = [
  RENTAL_CONTRACT_TEMPLATE,
  SALE_CONTRACT_TEMPLATE,
];
