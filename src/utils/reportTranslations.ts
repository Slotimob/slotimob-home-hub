// ============================================================================
// TRANSLATION UTILITIES FOR REPORTS
// Maps database terms to user-friendly Portuguese labels
// ============================================================================

// Pipeline Stages (deals/negotiations)
export const stageTranslations: Record<string, string> = {
  won: 'Ganho',
  lost: 'Perdido',
  in_contact: 'Em Contato',
  new_lead: 'Novo Lead',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  visit_scheduled: 'Visita Agendada',
  documentation: 'Documentação',
  closing: 'Fechamento',
};

// Unit Status
export const unitStatusTranslations: Record<string, string> = {
  available: 'Disponível',
  rented: 'Alugado',
  reserved: 'Reservado',
  sold: 'Vendido',
  unavailable: 'Indisponível',
  maintenance: 'Em Manutenção',
};

// Transaction Types
export const transactionTypeTranslations: Record<string, string> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
};

// Transaction Status
export const transactionStatusTranslations: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
  scheduled: 'Agendado',
};

// Lease Status
export const leaseStatusTranslations: Record<string, string> = {
  active: 'Ativo',
  terminated: 'Encerrado',
  pending: 'Pendente',
  expired: 'Expirado',
};

// Contract Status
export const contractStatusTranslations: Record<string, string> = {
  draft: 'Rascunho',
  pending_signature: 'Aguardando Assinatura',
  signed: 'Assinado',
  active: 'Ativo',
  terminated: 'Encerrado',
};

// Guarantee Types
export const guaranteeTypeTranslations: Record<string, string> = {
  fiador: 'Fiador',
  deposito: 'Depósito Caução',
  seguro_fianca: 'Seguro Fiança',
  titulo_capitalizacao: 'Título de Capitalização',
  sem_garantia: 'Sem Garantia',
};

// Lead Origins
export const originTranslations: Record<string, string> = {
  website: 'Site',
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google Ads',
  referral: 'Indicação',
  portal: 'Portal Imobiliário',
  phone: 'Telefone',
  walkin: 'Visita Espontânea',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
};

// Property Types
export const propertyTypeTranslations: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
  office: 'Sala Comercial',
  warehouse: 'Galpão',
  retail: 'Loja',
  studio: 'Studio',
  penthouse: 'Cobertura',
};

// Generic translator function
export function translate(
  value: string | null | undefined, 
  dictionary: Record<string, string>,
  fallback?: string
): string {
  if (!value) return fallback || '-';
  return dictionary[value.toLowerCase()] || dictionary[value] || value;
}

// Shorthand translators
export const translateStage = (stage: string | null | undefined): string => 
  translate(stage, stageTranslations);

export const translateUnitStatus = (status: string | null | undefined): string => 
  translate(status, unitStatusTranslations);

export const translateType = (type: string | null | undefined): string => 
  translate(type, transactionTypeTranslations);

export const translateTransactionStatus = (status: string | null | undefined): string => 
  translate(status, transactionStatusTranslations);

export const translateLeaseStatus = (status: string | null | undefined): string => 
  translate(status, leaseStatusTranslations);

export const translateOrigin = (origin: string | null | undefined): string => 
  translate(origin, originTranslations, 'Não informado');

export const translatePropertyType = (type: string | null | undefined): string => 
  translate(type, propertyTypeTranslations);

export const translateGuaranteeType = (type: string | null | undefined): string => 
  translate(type, guaranteeTypeTranslations);
