// Financial Categories Default Data
// Structured for future DRE (Demonstrativo do Resultado do Exercício) generation
// Supports multiple user profiles: Proprietário, Corretor, Imobiliária

export type DREType = 
  | 'gross_revenue'      // Receita Bruta
  | 'financial_revenue'  // Receitas Financeiras
  | 'variable_cost'      // Custos Variáveis
  | 'tax_deduction'      // Deduções (Impostos)
  | 'sales_expense'      // Despesas Comerciais
  | 'admin_expense'      // Despesas Administrativas
  | 'financial_expense'  // Despesas Financeiras
  | 'profit_distribution'; // Distribuição de Lucros

export interface FinancialCategory {
  name: string;
  type: 'income' | 'expense';
  group: string;
  dre_type: DREType;
  color: string;
  icon?: string;
  priority?: number; // Lower numbers appear first in dropdowns
  tooltip?: string;  // Explanation for complex categories
}

// Standardized colors - enforced by type
export const CATEGORY_COLORS = {
  income: '#22c55e',  // Green
  expense: '#ef4444', // Red
};

export const DEFAULT_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  // === RECEITAS (Verde #22c55e) ===
  // Priority 1-10: Core income categories
  { 
    name: "Aluguéis", 
    type: "income", 
    group: "Operacional", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 1,
    tooltip: "Valores de aluguel recebidos de inquilinos"
  },
  { 
    name: "Comissão de Venda", 
    type: "income", 
    group: "Operacional", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 2
  },
  { 
    name: "Taxa de Administração", 
    type: "income", 
    group: "Operacional", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 3,
    tooltip: "Taxa cobrada pela administração de imóveis de terceiros"
  },
  { 
    name: "Honorários de Avaliação", 
    type: "income", 
    group: "Serviços", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 10
  },
  { 
    name: "Comissão de Parcerias", 
    type: "income", 
    group: "Parcerias", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 11
  },
  { 
    name: "Rendimentos Financeiros", 
    type: "income", 
    group: "Financeiro", 
    dre_type: "financial_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 20
  },

  // === ENCARGOS DE LOCAÇÃO (Receita) ===
  { 
    name: "IPTU", 
    type: "income", 
    group: "Encargos de Locação", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 5,
    tooltip: "Valor do IPTU repassado pelo inquilino"
  },
  { 
    name: "Seguro Incêndio", 
    type: "income", 
    group: "Encargos de Locação", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 6,
    tooltip: "Valor do seguro incêndio repassado pelo inquilino"
  },
  { 
    name: "Condomínio", 
    type: "income", 
    group: "Encargos de Locação", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 7,
    tooltip: "Valor do condomínio repassado pelo inquilino"
  },
  { 
    name: "Taxa de Lixo", 
    type: "income", 
    group: "Encargos de Locação", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 7,
    tooltip: "Valor da taxa de lixo repassado pelo inquilino"
  },
  { 
    name: "Energia", 
    type: "income", 
    group: "Encargos de Locação", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 8,
    tooltip: "Valor da energia elétrica repassado pelo inquilino"
  },
  { 
    name: "Água", 
    type: "income", 
    group: "Encargos de Locação", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 9,
    tooltip: "Valor da água repassado pelo inquilino"
  },
  { 
    name: "Gás", 
    type: "income", 
    group: "Encargos de Locação", 
    dre_type: "gross_revenue", 
    color: CATEGORY_COLORS.income,
    priority: 10,
    tooltip: "Valor do gás repassado pelo inquilino"
  },

  // === DESPESAS VARIÁVEIS (Custo Direto) ===
  { 
    name: "Repasse a Proprietário", 
    type: "expense", 
    group: "Custo de Venda", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 1,
    tooltip: "Valores recebidos do inquilino que são repassados ao proprietário do imóvel. Afeta diretamente o Lucro Bruto."
  },
  { 
    name: "Repasse de Comissão (Split)", 
    type: "expense", 
    group: "Custo de Venda", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 2,
    tooltip: "Comissão dividida com outros corretores ou parceiros"
  },
  { 
    name: "Manutenção de Imóvel", 
    type: "expense", 
    group: "Custo de Venda", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 3,
    tooltip: "Reparos e manutenções em imóveis administrados"
  },
  { 
    name: "Repasse de IPTU", 
    type: "expense", 
    group: "Encargos de Locação", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 4,
    tooltip: "Valor do IPTU recebido do inquilino e repassado ao proprietário"
  },
  { 
    name: "Repasse de Seguro Incêndio", 
    type: "expense", 
    group: "Encargos de Locação", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 5,
    tooltip: "Valor do seguro incêndio recebido do inquilino e repassado ao proprietário"
  },
  { 
    name: "Repasse de Condomínio", 
    type: "expense", 
    group: "Encargos de Locação", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 6,
    tooltip: "Valor do condomínio recebido do inquilino e repassado ao proprietário"
  },
  { 
    name: "Repasse de Energia", 
    type: "expense", 
    group: "Encargos de Locação", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 7,
    tooltip: "Valor da energia elétrica recebido do inquilino e repassado ao proprietário"
  },
  { 
    name: "Repasse de Água", 
    type: "expense", 
    group: "Encargos de Locação", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 8,
    tooltip: "Valor da água recebido do inquilino e repassado ao proprietário"
  },
  { 
    name: "Repasse de Gás", 
    type: "expense", 
    group: "Encargos de Locação", 
    dre_type: "variable_cost", 
    color: CATEGORY_COLORS.expense,
    priority: 9,
    tooltip: "Valor do gás recebido do inquilino e repassado ao proprietário"
  },

  // === IMPOSTOS E DEDUÇÕES ===
  { 
    name: "Impostos e Deduções", 
    type: "expense", 
    group: "Impostos", 
    dre_type: "tax_deduction", 
    color: CATEGORY_COLORS.expense,
    priority: 10
  },
  { 
    name: "Impostos s/ Nota (Simples/ISS)", 
    type: "expense", 
    group: "Impostos", 
    dre_type: "tax_deduction", 
    color: CATEGORY_COLORS.expense,
    priority: 11
  },

  // === DESPESAS COMERCIAIS (Marketing) ===
  { 
    name: "Marketing e Portais", 
    type: "expense", 
    group: "Marketing", 
    dre_type: "sales_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 20
  },
  { 
    name: "Portais Imobiliários", 
    type: "expense", 
    group: "Marketing", 
    dre_type: "sales_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 21
  },
  { 
    name: "Tráfego Pago (Ads)", 
    type: "expense", 
    group: "Marketing", 
    dre_type: "sales_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 22
  },
  { 
    name: "Produção de Mídia", 
    type: "expense", 
    group: "Marketing", 
    dre_type: "sales_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 23
  },

  // === DESPESAS ADMINISTRATIVAS ===
  { 
    name: "Sistemas e Software", 
    type: "expense", 
    group: "Administrativo", 
    dre_type: "admin_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 30
  },
  { 
    name: "Aluguel/Condomínio Escritório", 
    type: "expense", 
    group: "Administrativo", 
    dre_type: "admin_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 31
  },
  { 
    name: "Transporte e Combustível", 
    type: "expense", 
    group: "Administrativo", 
    dre_type: "admin_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 32
  },
  { 
    name: "Pró-labore (Sócios)", 
    type: "expense", 
    group: "Pessoal", 
    dre_type: "admin_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 40
  },
  { 
    name: "Salários e Encargos", 
    type: "expense", 
    group: "Pessoal", 
    dre_type: "admin_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 41
  },

  // === DESPESAS FINANCEIRAS ===
  { 
    name: "Taxas Bancárias/Juros", 
    type: "expense", 
    group: "Financeiro", 
    dre_type: "financial_expense", 
    color: CATEGORY_COLORS.expense,
    priority: 50
  },

  // === NÃO OPERACIONAL ===
  { 
    name: "Distribuição de Lucros", 
    type: "expense", 
    group: "Sócios", 
    dre_type: "profit_distribution", 
    color: CATEGORY_COLORS.expense,
    priority: 100
  }
];

// Helper to get categories by type, sorted by priority
export const getDefaultCategoriesByType = (type: 'income' | 'expense') => 
  DEFAULT_FINANCIAL_CATEGORIES
    .filter(cat => cat.type === type)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

// Helper to get categories by DRE type
export const getCategoriesByDREType = (dreType: DREType) =>
  DEFAULT_FINANCIAL_CATEGORIES.filter(cat => cat.dre_type === dreType);

// Helper to get categories by group
export const getCategoriesByGroup = (group: string) =>
  DEFAULT_FINANCIAL_CATEGORIES.filter(cat => cat.group === group);

// Get unique groups
export const getUniqueGroups = () => 
  [...new Set(DEFAULT_FINANCIAL_CATEGORIES.map(cat => cat.group))];

// Get groups organized by type
export const getGroupsByType = (type: 'income' | 'expense') => {
  const cats = DEFAULT_FINANCIAL_CATEGORIES.filter(cat => cat.type === type);
  return [...new Set(cats.map(cat => cat.group))];
};

// DRE Type Labels for display
export const DRE_TYPE_LABELS: Record<string, string> = {
  gross_revenue: 'Receita Bruta',
  financial_revenue: 'Receitas Financeiras',
  variable_cost: 'Custos Variáveis',
  tax_deduction: 'Deduções (Impostos)',
  sales_expense: 'Despesas Comerciais',
  admin_expense: 'Despesas Administrativas',
  financial_expense: 'Despesas Financeiras',
  profit_distribution: 'Distribuição de Lucros'
};

// Category groups by type
export const CATEGORY_GROUPS: Record<'income' | 'expense', string[]> = {
  income: ["Operacional", "Encargos de Locação", "Serviços", "Parcerias", "Financeiro", "Outros"],
  expense: ["Custo de Venda", "Encargos de Locação", "Impostos", "Marketing", "Administrativo", "Pessoal", "Financeiro", "Sócios", "Outros"],
};

// DRE Types for income categories
export const DRE_TYPES_INCOME = [
  { 
    value: "gross_revenue", 
    label: "Receita Bruta", 
    description: "Receitas operacionais principais" 
  },
  { 
    value: "financial_revenue", 
    label: "Receitas Financeiras", 
    description: "Rendimentos de aplicações e juros" 
  },
];

// DRE Types for expense categories
export const DRE_TYPES_EXPENSE = [
  { 
    value: "variable_cost", 
    label: "Custos Variáveis", 
    description: "Custos que variam com as vendas (ex: repasses, splits)" 
  },
  { 
    value: "tax_deduction", 
    label: "Deduções/Impostos", 
    description: "Impostos sobre notas e serviços" 
  },
  { 
    value: "sales_expense", 
    label: "Despesas Comerciais", 
    description: "Marketing, portais, publicidade" 
  },
  { 
    value: "admin_expense", 
    label: "Despesas Administrativas", 
    description: "Escritório, sistemas, pessoal" 
  },
  { 
    value: "financial_expense", 
    label: "Despesas Financeiras", 
    description: "Taxas bancárias, juros" 
  },
  { 
    value: "profit_distribution", 
    label: "Distribuição de Lucros", 
    description: "Retirada de sócios" 
  },
];

// Categories that should show tooltips
export const CATEGORIES_WITH_TOOLTIPS: Record<string, string> = {
  "Repasse a Proprietário": "Use esta categoria para valores que você recebe do inquilino e transfere ao dono do imóvel. Afeta o cálculo do Lucro Bruto.",
  "Taxa de Administração": "Taxa cobrada pela administração de imóveis de terceiros.",
  "Manutenção de Imóvel": "Reparos e manutenções em imóveis administrados.",
};
