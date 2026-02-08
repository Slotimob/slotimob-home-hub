export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'currency' | 'phone' | 'cpf' | 'email';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  section: string;
  defaultValue?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: 'captacao' | 'recibos' | 'vistorias' | 'diversos' | 'locacao';
  description: string;
  fields: TemplateField[];
  templateContent: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  captacao: 'Fichas de Captação',
  recibos: 'Recibos',
  vistorias: 'Visitas e Vistorias',
  diversos: 'Documentos Diversos',
  locacao: 'Locação',
};

export const CATEGORY_COLORS: Record<string, string> = {
  captacao: 'bg-blue-500',
  recibos: 'bg-green-500',
  vistorias: 'bg-amber-500',
  diversos: 'bg-purple-500',
  locacao: 'bg-rose-500',
};

export const documentTemplates: DocumentTemplate[] = [
  // FICHAS DE CAPTAÇÃO
  {
    id: 'ficha-captacao-clientes',
    name: 'Ficha de Captação de Clientes',
    category: 'captacao',
    description: 'Formulário para cadastro de clientes interessados em imóveis',
    fields: [
      { id: 'codigo', label: 'Código', type: 'text', section: 'Identificação', placeholder: 'Ex: CLI-001' },
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'corretor', label: 'Corretor Responsável', type: 'text', section: 'Identificação', required: true },
      { id: 'creci', label: 'CRECI', type: 'text', section: 'Identificação' },
      { id: 'nome_cliente', label: 'Nome do Cliente', type: 'text', section: 'Dados do Cliente', required: true },
      { id: 'cpf', label: 'CPF', type: 'cpf', section: 'Dados do Cliente' },
      { id: 'telefone', label: 'Telefone', type: 'phone', section: 'Dados do Cliente', required: true },
      { id: 'email', label: 'E-mail', type: 'email', section: 'Dados do Cliente' },
      { id: 'endereco', label: 'Endereço Atual', type: 'text', section: 'Dados do Cliente' },
      { id: 'tipo_interesse', label: 'Tipo de Interesse', type: 'select', section: 'Perfil de Interesse', options: ['Compra', 'Locação', 'Ambos'] },
      { id: 'tipo_imovel', label: 'Tipo de Imóvel', type: 'select', section: 'Perfil de Interesse', options: ['Apartamento', 'Casa', 'Terreno', 'Comercial', 'Rural'] },
      { id: 'quartos', label: 'Nº de Quartos', type: 'select', section: 'Perfil de Interesse', options: ['1', '2', '3', '4+'] },
      { id: 'faixa_preco_min', label: 'Faixa de Preço (Mín)', type: 'currency', section: 'Perfil de Interesse' },
      { id: 'faixa_preco_max', label: 'Faixa de Preço (Máx)', type: 'currency', section: 'Perfil de Interesse' },
      { id: 'regioes', label: 'Regiões de Interesse', type: 'textarea', section: 'Perfil de Interesse', placeholder: 'Ex: Centro, Zona Sul...' },
      { id: 'observacoes', label: 'Observações', type: 'textarea', section: 'Informações Adicionais' },
    ],
    templateContent: `
FICHA DE CAPTAÇÃO DE CLIENTES

IDENTIFICAÇÃO
Código: {{codigo}}
Data: {{data}}
Corretor: {{corretor}}
CRECI: {{creci}}

DADOS DO CLIENTE
Nome: {{nome_cliente}}
CPF: {{cpf}}
Telefone: {{telefone}}
E-mail: {{email}}
Endereço Atual: {{endereco}}

PERFIL DE INTERESSE
Tipo de Interesse: {{tipo_interesse}}
Tipo de Imóvel: {{tipo_imovel}}
Nº de Quartos: {{quartos}}
Faixa de Preço: {{faixa_preco_min}} a {{faixa_preco_max}}
Regiões de Interesse: {{regioes}}

OBSERVAÇÕES
{{observacoes}}
    `,
  },
  {
    id: 'ficha-captacao-imoveis',
    name: 'Ficha de Captação de Imóveis',
    category: 'captacao',
    description: 'Formulário para cadastro de imóveis disponíveis para venda ou locação',
    fields: [
      { id: 'codigo', label: 'Código do Imóvel', type: 'text', section: 'Identificação', placeholder: 'Ex: IMV-001' },
      { id: 'data', label: 'Data de Captação', type: 'date', section: 'Identificação', required: true },
      { id: 'corretor', label: 'Corretor Responsável', type: 'text', section: 'Identificação', required: true },
      { id: 'nome_proprietario', label: 'Nome do Proprietário', type: 'text', section: 'Dados do Proprietário', required: true },
      { id: 'cpf_proprietario', label: 'CPF do Proprietário', type: 'cpf', section: 'Dados do Proprietário' },
      { id: 'telefone_proprietario', label: 'Telefone', type: 'phone', section: 'Dados do Proprietário', required: true },
      { id: 'email_proprietario', label: 'E-mail', type: 'email', section: 'Dados do Proprietário' },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Localização', required: true },
      { id: 'bairro', label: 'Bairro', type: 'text', section: 'Localização' },
      { id: 'cidade', label: 'Cidade', type: 'text', section: 'Localização' },
      { id: 'cep', label: 'CEP', type: 'text', section: 'Localização' },
      { id: 'tipo_imovel', label: 'Tipo de Imóvel', type: 'select', section: 'Características', options: ['Apartamento', 'Casa', 'Terreno', 'Sala Comercial', 'Galpão', 'Sítio/Chácara'] },
      { id: 'area_total', label: 'Área Total (m²)', type: 'number', section: 'Características' },
      { id: 'area_construida', label: 'Área Construída (m²)', type: 'number', section: 'Características' },
      { id: 'quartos', label: 'Nº de Quartos', type: 'number', section: 'Características' },
      { id: 'suites', label: 'Nº de Suítes', type: 'number', section: 'Características' },
      { id: 'banheiros', label: 'Nº de Banheiros', type: 'number', section: 'Características' },
      { id: 'vagas', label: 'Vagas de Garagem', type: 'number', section: 'Características' },
      { id: 'finalidade', label: 'Finalidade', type: 'select', section: 'Valores', options: ['Venda', 'Locação', 'Venda e Locação'] },
      { id: 'valor_venda', label: 'Valor de Venda', type: 'currency', section: 'Valores' },
      { id: 'valor_locacao', label: 'Valor de Locação', type: 'currency', section: 'Valores' },
      { id: 'condominio', label: 'Valor do Condomínio', type: 'currency', section: 'Valores' },
      { id: 'iptu', label: 'Valor do IPTU (anual)', type: 'currency', section: 'Valores' },
      { id: 'observacoes', label: 'Observações', type: 'textarea', section: 'Informações Adicionais' },
    ],
    templateContent: `
FICHA DE CAPTAÇÃO DE IMÓVEIS

IDENTIFICAÇÃO
Código: {{codigo}}
Data de Captação: {{data}}
Corretor: {{corretor}}

DADOS DO PROPRIETÁRIO
Nome: {{nome_proprietario}}
CPF: {{cpf_proprietario}}
Telefone: {{telefone_proprietario}}
E-mail: {{email_proprietario}}

LOCALIZAÇÃO DO IMÓVEL
Endereço: {{endereco_imovel}}
Bairro: {{bairro}}
Cidade: {{cidade}}
CEP: {{cep}}

CARACTERÍSTICAS
Tipo: {{tipo_imovel}}
Área Total: {{area_total}} m²
Área Construída: {{area_construida}} m²
Quartos: {{quartos}} | Suítes: {{suites}}
Banheiros: {{banheiros}} | Vagas: {{vagas}}

VALORES
Finalidade: {{finalidade}}
Valor de Venda: {{valor_venda}}
Valor de Locação: {{valor_locacao}}
Condomínio: {{condominio}}
IPTU (anual): {{iptu}}

OBSERVAÇÕES
{{observacoes}}
    `,
  },
  {
    id: 'ficha-cadastro-pf',
    name: 'Ficha de Cadastro Pessoa Física',
    category: 'captacao',
    description: 'Cadastro completo de pessoa física para transações imobiliárias',
    fields: [
      { id: 'nome_completo', label: 'Nome Completo', type: 'text', section: 'Dados Pessoais', required: true },
      { id: 'cpf', label: 'CPF', type: 'cpf', section: 'Dados Pessoais', required: true },
      { id: 'rg', label: 'RG', type: 'text', section: 'Dados Pessoais' },
      { id: 'orgao_emissor', label: 'Órgão Emissor', type: 'text', section: 'Dados Pessoais' },
      { id: 'data_nascimento', label: 'Data de Nascimento', type: 'date', section: 'Dados Pessoais' },
      { id: 'estado_civil', label: 'Estado Civil', type: 'select', section: 'Dados Pessoais', options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'] },
      { id: 'nacionalidade', label: 'Nacionalidade', type: 'text', section: 'Dados Pessoais', defaultValue: 'Brasileiro(a)' },
      { id: 'profissao', label: 'Profissão', type: 'text', section: 'Dados Profissionais' },
      { id: 'empresa', label: 'Empresa', type: 'text', section: 'Dados Profissionais' },
      { id: 'renda_mensal', label: 'Renda Mensal', type: 'currency', section: 'Dados Profissionais' },
      { id: 'telefone', label: 'Telefone', type: 'phone', section: 'Contato', required: true },
      { id: 'celular', label: 'Celular', type: 'phone', section: 'Contato' },
      { id: 'email', label: 'E-mail', type: 'email', section: 'Contato' },
      { id: 'endereco', label: 'Endereço Completo', type: 'text', section: 'Endereço' },
      { id: 'bairro', label: 'Bairro', type: 'text', section: 'Endereço' },
      { id: 'cidade', label: 'Cidade', type: 'text', section: 'Endereço' },
      { id: 'estado', label: 'Estado', type: 'text', section: 'Endereço' },
      { id: 'cep', label: 'CEP', type: 'text', section: 'Endereço' },
    ],
    templateContent: `
FICHA DE CADASTRO - PESSOA FÍSICA

DADOS PESSOAIS
Nome Completo: {{nome_completo}}
CPF: {{cpf}}
RG: {{rg}} - Órgão Emissor: {{orgao_emissor}}
Data de Nascimento: {{data_nascimento}}
Estado Civil: {{estado_civil}}
Nacionalidade: {{nacionalidade}}

DADOS PROFISSIONAIS
Profissão: {{profissao}}
Empresa: {{empresa}}
Renda Mensal: {{renda_mensal}}

CONTATO
Telefone: {{telefone}}
Celular: {{celular}}
E-mail: {{email}}

ENDEREÇO
Endereço: {{endereco}}
Bairro: {{bairro}}
Cidade: {{cidade}} - {{estado}}
CEP: {{cep}}
    `,
  },
  {
    id: 'ficha-financiamento',
    name: 'Ficha para Financiamento Imobiliário',
    category: 'captacao',
    description: 'Formulário para análise de financiamento imobiliário',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_cliente', label: 'Nome Completo', type: 'text', section: 'Dados do Cliente', required: true },
      { id: 'cpf', label: 'CPF', type: 'cpf', section: 'Dados do Cliente', required: true },
      { id: 'data_nascimento', label: 'Data de Nascimento', type: 'date', section: 'Dados do Cliente' },
      { id: 'telefone', label: 'Telefone', type: 'phone', section: 'Dados do Cliente' },
      { id: 'email', label: 'E-mail', type: 'email', section: 'Dados do Cliente' },
      { id: 'renda_bruta', label: 'Renda Bruta Mensal', type: 'currency', section: 'Dados Financeiros', required: true },
      { id: 'comprometimento', label: 'Comprometimento de Renda Atual', type: 'currency', section: 'Dados Financeiros' },
      { id: 'valor_imovel', label: 'Valor do Imóvel Pretendido', type: 'currency', section: 'Financiamento', required: true },
      { id: 'valor_entrada', label: 'Valor de Entrada', type: 'currency', section: 'Financiamento' },
      { id: 'valor_financiar', label: 'Valor a Financiar', type: 'currency', section: 'Financiamento' },
      { id: 'prazo', label: 'Prazo (meses)', type: 'number', section: 'Financiamento' },
      { id: 'possui_fgts', label: 'Possui FGTS?', type: 'select', section: 'FGTS', options: ['Sim', 'Não'] },
      { id: 'saldo_fgts', label: 'Saldo do FGTS', type: 'currency', section: 'FGTS' },
      { id: 'tempo_fgts', label: 'Tempo de FGTS (meses)', type: 'number', section: 'FGTS' },
      { id: 'primeiro_imovel', label: 'Primeiro Imóvel?', type: 'select', section: 'Documentação', options: ['Sim', 'Não'] },
      { id: 'observacoes', label: 'Observações', type: 'textarea', section: 'Observações' },
    ],
    templateContent: `
FICHA PARA FINANCIAMENTO IMOBILIÁRIO

Data: {{data}}

DADOS DO CLIENTE
Nome: {{nome_cliente}}
CPF: {{cpf}}
Data de Nascimento: {{data_nascimento}}
Telefone: {{telefone}}
E-mail: {{email}}

DADOS FINANCEIROS
Renda Bruta Mensal: {{renda_bruta}}
Comprometimento de Renda Atual: {{comprometimento}}

FINANCIAMENTO PRETENDIDO
Valor do Imóvel: {{valor_imovel}}
Valor de Entrada: {{valor_entrada}}
Valor a Financiar: {{valor_financiar}}
Prazo: {{prazo}} meses

FGTS
Possui FGTS: {{possui_fgts}}
Saldo do FGTS: {{saldo_fgts}}
Tempo de FGTS: {{tempo_fgts}} meses

DOCUMENTAÇÃO
Primeiro Imóvel: {{primeiro_imovel}}

OBSERVAÇÕES
{{observacoes}}
    `,
  },

  // RECIBOS
  {
    id: 'recibo-chaves',
    name: 'Recibo de Entrega de Chaves',
    category: 'recibos',
    description: 'Comprovante de entrega de chaves do imóvel',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_entregante', label: 'Nome do Entregante', type: 'text', section: 'Partes', required: true },
      { id: 'cpf_entregante', label: 'CPF do Entregante', type: 'cpf', section: 'Partes' },
      { id: 'nome_recebedor', label: 'Nome do Recebedor', type: 'text', section: 'Partes', required: true },
      { id: 'cpf_recebedor', label: 'CPF do Recebedor', type: 'cpf', section: 'Partes' },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'quantidade_chaves', label: 'Quantidade de Chaves', type: 'number', section: 'Chaves' },
      { id: 'descricao_chaves', label: 'Descrição das Chaves', type: 'textarea', section: 'Chaves', placeholder: 'Ex: 2 chaves da porta principal, 1 chave do portão...' },
      { id: 'observacoes', label: 'Observações', type: 'textarea', section: 'Observações' },
    ],
    templateContent: `
RECIBO DE ENTREGA DE CHAVES

Data: {{data}}

ENTREGANTE
Nome: {{nome_entregante}}
CPF: {{cpf_entregante}}

RECEBEDOR
Nome: {{nome_recebedor}}
CPF: {{cpf_recebedor}}

IMÓVEL
Endereço: {{endereco_imovel}}

CHAVES ENTREGUES
Quantidade: {{quantidade_chaves}} chave(s)
Descrição: {{descricao_chaves}}

OBSERVAÇÕES
{{observacoes}}

_______________________________
Assinatura do Entregante

_______________________________
Assinatura do Recebedor
    `,
  },
  {
    id: 'recibo-aluguel',
    name: 'Recibo de Pagamento de Aluguel',
    category: 'recibos',
    description: 'Comprovante de pagamento de aluguel mensal',
    fields: [
      { id: 'numero_recibo', label: 'Nº do Recibo', type: 'text', section: 'Identificação' },
      { id: 'data', label: 'Data do Pagamento', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_locador', label: 'Nome do Locador', type: 'text', section: 'Locador', required: true },
      { id: 'cpf_locador', label: 'CPF do Locador', type: 'cpf', section: 'Locador' },
      { id: 'nome_locatario', label: 'Nome do Locatário', type: 'text', section: 'Locatário', required: true },
      { id: 'cpf_locatario', label: 'CPF do Locatário', type: 'cpf', section: 'Locatário' },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'mes_referencia', label: 'Mês de Referência', type: 'text', section: 'Pagamento', placeholder: 'Ex: Janeiro/2025' },
      { id: 'valor_aluguel', label: 'Valor do Aluguel', type: 'currency', section: 'Pagamento', required: true },
      { id: 'valor_condominio', label: 'Valor do Condomínio', type: 'currency', section: 'Pagamento' },
      { id: 'valor_iptu', label: 'Valor do IPTU', type: 'currency', section: 'Pagamento' },
      { id: 'valor_total', label: 'Valor Total', type: 'currency', section: 'Pagamento' },
      { id: 'forma_pagamento', label: 'Forma de Pagamento', type: 'select', section: 'Pagamento', options: ['Dinheiro', 'PIX', 'Transferência', 'Boleto', 'Cheque'] },
    ],
    templateContent: `
RECIBO DE PAGAMENTO DE ALUGUEL

Recibo Nº: {{numero_recibo}}
Data: {{data}}

LOCADOR (PROPRIETÁRIO)
Nome: {{nome_locador}}
CPF: {{cpf_locador}}

LOCATÁRIO (INQUILINO)
Nome: {{nome_locatario}}
CPF: {{cpf_locatario}}

IMÓVEL
Endereço: {{endereco_imovel}}

DISCRIMINAÇÃO DO PAGAMENTO
Mês de Referência: {{mes_referencia}}
Aluguel: {{valor_aluguel}}
Condomínio: {{valor_condominio}}
IPTU: {{valor_iptu}}
━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: {{valor_total}}

Forma de Pagamento: {{forma_pagamento}}

_______________________________
Assinatura do Locador
    `,
  },
  {
    id: 'recibo-sinal',
    name: 'Recibo de Sinal de Negócio',
    category: 'recibos',
    description: 'Comprovante de recebimento de sinal para transação imobiliária',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_vendedor', label: 'Nome do Vendedor', type: 'text', section: 'Vendedor', required: true },
      { id: 'cpf_vendedor', label: 'CPF do Vendedor', type: 'cpf', section: 'Vendedor' },
      { id: 'nome_comprador', label: 'Nome do Comprador', type: 'text', section: 'Comprador', required: true },
      { id: 'cpf_comprador', label: 'CPF do Comprador', type: 'cpf', section: 'Comprador' },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'valor_total', label: 'Valor Total do Imóvel', type: 'currency', section: 'Valores', required: true },
      { id: 'valor_sinal', label: 'Valor do Sinal', type: 'currency', section: 'Valores', required: true },
      { id: 'saldo_restante', label: 'Saldo Restante', type: 'currency', section: 'Valores' },
      { id: 'forma_pagamento', label: 'Forma de Pagamento', type: 'select', section: 'Pagamento', options: ['Dinheiro', 'PIX', 'Transferência', 'Cheque'] },
      { id: 'data_escritura', label: 'Previsão de Escritura', type: 'date', section: 'Pagamento' },
      { id: 'condicoes', label: 'Condições Especiais', type: 'textarea', section: 'Condições' },
    ],
    templateContent: `
RECIBO DE SINAL DE NEGÓCIO

Data: {{data}}

VENDEDOR
Nome: {{nome_vendedor}}
CPF: {{cpf_vendedor}}

COMPRADOR
Nome: {{nome_comprador}}
CPF: {{cpf_comprador}}

IMÓVEL OBJETO DA NEGOCIAÇÃO
Endereço: {{endereco_imovel}}

VALORES
Valor Total do Imóvel: {{valor_total}}
Valor do Sinal: {{valor_sinal}}
Saldo Restante: {{saldo_restante}}

PAGAMENTO
Forma de Pagamento do Sinal: {{forma_pagamento}}
Previsão de Escritura: {{data_escritura}}

CONDIÇÕES ESPECIAIS
{{condicoes}}

_______________________________
Assinatura do Vendedor

_______________________________
Assinatura do Comprador
    `,
  },

  // VISTORIAS
  {
    id: 'termo-vistoria-locacao',
    name: 'Termo de Vistoria para Locação',
    category: 'vistorias',
    description: 'Documento detalhado de vistoria de entrada ou saída do imóvel',
    fields: [
      { id: 'tipo_vistoria', label: 'Tipo de Vistoria', type: 'select', section: 'Identificação', options: ['Entrada', 'Saída'], required: true },
      { id: 'data', label: 'Data da Vistoria', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_locador', label: 'Nome do Locador', type: 'text', section: 'Partes', required: true },
      { id: 'nome_locatario', label: 'Nome do Locatário', type: 'text', section: 'Partes', required: true },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'estado_sala', label: 'Estado da Sala', type: 'textarea', section: 'Vistoria - Sala', placeholder: 'Descreva paredes, piso, janelas, luminárias...' },
      { id: 'estado_cozinha', label: 'Estado da Cozinha', type: 'textarea', section: 'Vistoria - Cozinha', placeholder: 'Descreva piso, azulejos, pia, torneira...' },
      { id: 'estado_quartos', label: 'Estado dos Quartos', type: 'textarea', section: 'Vistoria - Quartos', placeholder: 'Descreva paredes, piso, janelas...' },
      { id: 'estado_banheiros', label: 'Estado dos Banheiros', type: 'textarea', section: 'Vistoria - Banheiros', placeholder: 'Descreva piso, louças, metais...' },
      { id: 'estado_area_servico', label: 'Área de Serviço', type: 'textarea', section: 'Vistoria - Área de Serviço' },
      { id: 'estado_instalacoes', label: 'Instalações Elétricas/Hidráulicas', type: 'textarea', section: 'Instalações' },
      { id: 'leitura_agua', label: 'Leitura do Hidrômetro', type: 'text', section: 'Medidores' },
      { id: 'leitura_luz', label: 'Leitura de Luz', type: 'text', section: 'Medidores' },
      { id: 'leitura_gas', label: 'Leitura de Gás', type: 'text', section: 'Medidores' },
      { id: 'observacoes_gerais', label: 'Observações Gerais', type: 'textarea', section: 'Observações' },
    ],
    templateContent: `
TERMO DE VISTORIA PARA LOCAÇÃO

TIPO: Vistoria de {{tipo_vistoria}}
Data: {{data}}

PARTES
Locador: {{nome_locador}}
Locatário: {{nome_locatario}}

IMÓVEL
Endereço: {{endereco_imovel}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIÇÃO DOS AMBIENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SALA
{{estado_sala}}

COZINHA
{{estado_cozinha}}

QUARTOS
{{estado_quartos}}

BANHEIROS
{{estado_banheiros}}

ÁREA DE SERVIÇO
{{estado_area_servico}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTALAÇÕES
{{estado_instalacoes}}

LEITURA DOS MEDIDORES
Água: {{leitura_agua}}
Luz: {{leitura_luz}}
Gás: {{leitura_gas}}

OBSERVAÇÕES GERAIS
{{observacoes_gerais}}

_______________________________
Assinatura do Locador

_______________________________
Assinatura do Locatário
    `,
  },
  {
    id: 'controle-visitas',
    name: 'Declaração de Controle de Visitas',
    category: 'vistorias',
    description: 'Registro de visitas realizadas ao imóvel',
    fields: [
      { id: 'data', label: 'Data da Visita', type: 'date', section: 'Identificação', required: true },
      { id: 'horario', label: 'Horário', type: 'text', section: 'Identificação', placeholder: 'Ex: 14:00' },
      { id: 'corretor', label: 'Corretor Responsável', type: 'text', section: 'Identificação', required: true },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'nome_visitante', label: 'Nome do Visitante', type: 'text', section: 'Visitante', required: true },
      { id: 'telefone_visitante', label: 'Telefone', type: 'phone', section: 'Visitante' },
      { id: 'email_visitante', label: 'E-mail', type: 'email', section: 'Visitante' },
      { id: 'interesse', label: 'Nível de Interesse', type: 'select', section: 'Avaliação', options: ['Alto', 'Médio', 'Baixo'] },
      { id: 'feedback', label: 'Feedback da Visita', type: 'textarea', section: 'Avaliação' },
      { id: 'proximos_passos', label: 'Próximos Passos', type: 'textarea', section: 'Avaliação' },
    ],
    templateContent: `
DECLARAÇÃO DE CONTROLE DE VISITAS

Data: {{data}}
Horário: {{horario}}
Corretor: {{corretor}}

IMÓVEL VISITADO
Endereço: {{endereco_imovel}}

DADOS DO VISITANTE
Nome: {{nome_visitante}}
Telefone: {{telefone_visitante}}
E-mail: {{email_visitante}}

AVALIAÇÃO DA VISITA
Nível de Interesse: {{interesse}}

Feedback: {{feedback}}

Próximos Passos: {{proximos_passos}}

_______________________________
Assinatura do Visitante

_______________________________
Assinatura do Corretor
    `,
  },

  // DOCUMENTOS DIVERSOS
  {
    id: 'autorizacao-venda',
    name: 'Autorização de Venda',
    category: 'diversos',
    description: 'Autorização do proprietário para o corretor comercializar o imóvel',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_proprietario', label: 'Nome do Proprietário', type: 'text', section: 'Proprietário', required: true },
      { id: 'cpf_proprietario', label: 'CPF', type: 'cpf', section: 'Proprietário', required: true },
      { id: 'endereco_proprietario', label: 'Endereço', type: 'text', section: 'Proprietário' },
      { id: 'nome_corretor', label: 'Nome do Corretor', type: 'text', section: 'Corretor', required: true },
      { id: 'creci', label: 'CRECI', type: 'text', section: 'Corretor' },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'matricula', label: 'Matrícula do Imóvel', type: 'text', section: 'Imóvel' },
      { id: 'valor_venda', label: 'Valor de Venda', type: 'currency', section: 'Valores', required: true },
      { id: 'comissao', label: 'Comissão (%)', type: 'number', section: 'Valores' },
      { id: 'prazo_autorizacao', label: 'Prazo da Autorização (dias)', type: 'number', section: 'Condições' },
      { id: 'exclusividade', label: 'Com Exclusividade?', type: 'select', section: 'Condições', options: ['Sim', 'Não'] },
    ],
    templateContent: `
AUTORIZAÇÃO DE VENDA

Data: {{data}}

PROPRIETÁRIO (AUTORIZANTE)
Nome: {{nome_proprietario}}
CPF: {{cpf_proprietario}}
Endereço: {{endereco_proprietario}}

CORRETOR (AUTORIZADO)
Nome: {{nome_corretor}}
CRECI: {{creci}}

IMÓVEL OBJETO DA AUTORIZAÇÃO
Endereço: {{endereco_imovel}}
Matrícula: {{matricula}}

CONDIÇÕES
Valor de Venda: {{valor_venda}}
Comissão: {{comissao}}%
Prazo: {{prazo_autorizacao}} dias
Exclusividade: {{exclusividade}}

O proprietário acima qualificado AUTORIZA o corretor a divulgar, apresentar e intermediar a venda do imóvel descrito, nas condições estabelecidas.

_______________________________
Assinatura do Proprietário

_______________________________
Assinatura do Corretor
    `,
  },
  {
    id: 'contrato-exclusividade',
    name: 'Contrato de Exclusividade',
    category: 'diversos',
    description: 'Contrato de exclusividade para comercialização do imóvel',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_proprietario', label: 'Nome do Proprietário', type: 'text', section: 'Contratante', required: true },
      { id: 'cpf_proprietario', label: 'CPF', type: 'cpf', section: 'Contratante' },
      { id: 'endereco_proprietario', label: 'Endereço', type: 'text', section: 'Contratante' },
      { id: 'nome_corretor', label: 'Nome do Corretor/Imobiliária', type: 'text', section: 'Contratado', required: true },
      { id: 'creci', label: 'CRECI', type: 'text', section: 'Contratado' },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'valor_venda', label: 'Valor de Venda', type: 'currency', section: 'Condições', required: true },
      { id: 'comissao', label: 'Comissão (%)', type: 'number', section: 'Condições' },
      { id: 'prazo_exclusividade', label: 'Prazo de Exclusividade (dias)', type: 'number', section: 'Condições' },
      { id: 'clausulas_especiais', label: 'Cláusulas Especiais', type: 'textarea', section: 'Condições' },
    ],
    templateContent: `
CONTRATO DE EXCLUSIVIDADE

Data: {{data}}

CONTRATANTE (PROPRIETÁRIO)
Nome: {{nome_proprietario}}
CPF: {{cpf_proprietario}}
Endereço: {{endereco_proprietario}}

CONTRATADO (CORRETOR)
Nome: {{nome_corretor}}
CRECI: {{creci}}

IMÓVEL
Endereço: {{endereco_imovel}}

CONDIÇÕES
Valor de Venda: {{valor_venda}}
Comissão: {{comissao}}%
Prazo de Exclusividade: {{prazo_exclusividade}} dias

CLÁUSULAS ESPECIAIS
{{clausulas_especiais}}

O CONTRATANTE concede ao CONTRATADO exclusividade para intermediar a venda do imóvel descrito, pelo prazo estabelecido.

_______________________________
Contratante

_______________________________
Contratado
    `,
  },
  {
    id: 'distrato',
    name: 'Distrato de Contrato',
    category: 'diversos',
    description: 'Termo de distrato/rescisão de contrato',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_parte1', label: 'Nome da Primeira Parte', type: 'text', section: 'Partes', required: true },
      { id: 'cpf_parte1', label: 'CPF da Primeira Parte', type: 'cpf', section: 'Partes' },
      { id: 'nome_parte2', label: 'Nome da Segunda Parte', type: 'text', section: 'Partes', required: true },
      { id: 'cpf_parte2', label: 'CPF da Segunda Parte', type: 'cpf', section: 'Partes' },
      { id: 'contrato_original', label: 'Contrato Original (referência)', type: 'text', section: 'Contrato', required: true },
      { id: 'data_contrato', label: 'Data do Contrato Original', type: 'date', section: 'Contrato' },
      { id: 'motivo_distrato', label: 'Motivo do Distrato', type: 'textarea', section: 'Distrato' },
      { id: 'condicoes_distrato', label: 'Condições do Distrato', type: 'textarea', section: 'Distrato' },
    ],
    templateContent: `
TERMO DE DISTRATO

Data: {{data}}

PRIMEIRA PARTE
Nome: {{nome_parte1}}
CPF: {{cpf_parte1}}

SEGUNDA PARTE
Nome: {{nome_parte2}}
CPF: {{cpf_parte2}}

CONTRATO ORIGINAL
Referência: {{contrato_original}}
Data: {{data_contrato}}

MOTIVO DO DISTRATO
{{motivo_distrato}}

CONDIÇÕES DO DISTRATO
{{condicoes_distrato}}

As partes acima qualificadas, de comum acordo, resolvem DISTRATAR o contrato acima referenciado, dando-se mútua quitação.

_______________________________
Primeira Parte

_______________________________
Segunda Parte
    `,
  },

  // LOCAÇÃO
  {
    id: 'carta-fiador',
    name: 'Carta ao Fiador',
    category: 'locacao',
    description: 'Comunicação ao fiador sobre situação do contrato de locação',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_fiador', label: 'Nome do Fiador', type: 'text', section: 'Destinatário', required: true },
      { id: 'endereco_fiador', label: 'Endereço do Fiador', type: 'text', section: 'Destinatário' },
      { id: 'nome_locatario', label: 'Nome do Locatário', type: 'text', section: 'Locatário', required: true },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel Locado', type: 'text', section: 'Imóvel', required: true },
      { id: 'motivo', label: 'Motivo da Comunicação', type: 'select', section: 'Assunto', options: ['Inadimplência', 'Renovação', 'Rescisão', 'Atualização de Dados'] },
      { id: 'valor_devido', label: 'Valor Devido', type: 'currency', section: 'Valores' },
      { id: 'meses_atraso', label: 'Meses em Atraso', type: 'number', section: 'Valores' },
      { id: 'conteudo', label: 'Conteúdo da Carta', type: 'textarea', section: 'Mensagem' },
      { id: 'nome_locador', label: 'Nome do Locador', type: 'text', section: 'Remetente', required: true },
    ],
    templateContent: `
CARTA AO FIADOR

{{data}}

Ao Sr(a). {{nome_fiador}}
{{endereco_fiador}}

Ref.: Contrato de Locação - {{endereco_imovel}}
Locatário: {{nome_locatario}}

Prezado(a) Fiador(a),

{{conteudo}}

Motivo: {{motivo}}
Valor Devido: {{valor_devido}}
Meses em Atraso: {{meses_atraso}}

Atenciosamente,

_______________________________
{{nome_locador}}
Locador
    `,
  },
  {
    id: 'carta-fianca',
    name: 'Carta Fiança',
    category: 'locacao',
    description: 'Declaração de fiança para contrato de locação',
    fields: [
      { id: 'data', label: 'Data', type: 'date', section: 'Identificação', required: true },
      { id: 'nome_fiador', label: 'Nome do Fiador', type: 'text', section: 'Fiador', required: true },
      { id: 'cpf_fiador', label: 'CPF do Fiador', type: 'cpf', section: 'Fiador', required: true },
      { id: 'rg_fiador', label: 'RG do Fiador', type: 'text', section: 'Fiador' },
      { id: 'endereco_fiador', label: 'Endereço do Fiador', type: 'text', section: 'Fiador' },
      { id: 'profissao_fiador', label: 'Profissão', type: 'text', section: 'Fiador' },
      { id: 'renda_fiador', label: 'Renda Mensal', type: 'currency', section: 'Fiador' },
      { id: 'nome_locatario', label: 'Nome do Locatário (Afiançado)', type: 'text', section: 'Afiançado', required: true },
      { id: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text', section: 'Imóvel', required: true },
      { id: 'valor_aluguel', label: 'Valor do Aluguel', type: 'currency', section: 'Valores' },
      { id: 'prazo_contrato', label: 'Prazo do Contrato (meses)', type: 'number', section: 'Contrato' },
    ],
    templateContent: `
CARTA FIANÇA

Data: {{data}}

FIADOR
Nome: {{nome_fiador}}
CPF: {{cpf_fiador}}
RG: {{rg_fiador}}
Endereço: {{endereco_fiador}}
Profissão: {{profissao_fiador}}
Renda Mensal: {{renda_fiador}}

AFIANÇADO (LOCATÁRIO)
Nome: {{nome_locatario}}

IMÓVEL OBJETO DA LOCAÇÃO
Endereço: {{endereco_imovel}}

VALORES E PRAZO
Valor do Aluguel: {{valor_aluguel}}
Prazo do Contrato: {{prazo_contrato}} meses

DECLARAÇÃO
O abaixo assinado declara que se responsabiliza solidariamente com o locatário pelo cumprimento de todas as obrigações contratuais, inclusive pelo pagamento de aluguéis, encargos, multas e demais cominações previstas no contrato de locação.

_______________________________
Assinatura do Fiador

_______________________________
Assinatura do Cônjuge (se aplicável)
    `,
  },
];

export const getTemplatesByCategory = (category: string): DocumentTemplate[] => {
  return documentTemplates.filter((t) => t.category === category);
};

export const getTemplateById = (id: string): DocumentTemplate | undefined => {
  return documentTemplates.find((t) => t.id === id);
};

export const getCategoryCounts = (): Record<string, number> => {
  return documentTemplates.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};
