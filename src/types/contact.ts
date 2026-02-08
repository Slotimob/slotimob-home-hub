/**
 * Sistema Unificado de Contatos
 * 
 * Este arquivo define as interfaces centrais para o gerenciamento de contatos,
 * substituindo as antigas entidades separadas (owners, leads, companies).
 */

// Categorias disponíveis para contatos
export const CONTACT_CATEGORY_VALUES = [
  'Proprietário',
  'Inquilino', 
  'Lead',
  'Empresa',
  'Fornecedor',
  'Fiador',
  'Parceiro',
] as const;

export type ContactCategory = typeof CONTACT_CATEGORY_VALUES[number];

// Tipos de documento suportados
export type DocumentType = 'CPF' | 'CNPJ' | 'RG' | null;

// Metadados específicos por categoria
export interface ContactMetadataLead {
  budget_min?: number;
  budget_max?: number;
  origin?: string;
  interest_type?: string[];
  preferred_regions?: string[];
  lead_type?: string;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface ContactMetadataOwner {
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
}

export interface ContactMetadataCompany {
  website?: string;
  contact_person?: string;
  trade_name?: string; // Nome fantasia
}

export interface ContactMetadataTenant {
  contract_start?: string;
  contract_end?: string;
  rent_value?: number;
  guarantor_id?: string;
}

// Metadados combinados
export type ContactMetadata = 
  & Partial<ContactMetadataLead>
  & Partial<ContactMetadataOwner>
  & Partial<ContactMetadataCompany>
  & Partial<ContactMetadataTenant>
  & Record<string, unknown>;

/**
 * Interface principal unificada de Contato
 * Substitui: Owner, Lead, Company
 */
export interface Contact {
  id: string;
  broker_id: string;
  assigned_user_id: string | null;
  
  // Identificação
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  
  // Documento
  document_type: DocumentType;
  document_number: string | null;
  
  // Endereço
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  
  // Categorização
  categories: ContactCategory[];
  metadata: ContactMetadata | null;
  notes: string | null;
  
  // Referências legadas (para migração)
  legacy_owner_id: string | null;
  legacy_lead_id: string | null;
  legacy_company_id: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Payload para criação de contato
 */
export interface CreateContactPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  document_type?: DocumentType;
  document_number?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  categories: ContactCategory[];
  metadata?: ContactMetadata | null;
  notes?: string | null;
}

/**
 * Helpers para verificar categorias
 */
export const isOwner = (contact: Contact): boolean => 
  contact.categories.includes('Proprietário');

export const isTenant = (contact: Contact): boolean => 
  contact.categories.includes('Inquilino');

export const isLead = (contact: Contact): boolean => 
  contact.categories.includes('Lead');

export const isCompany = (contact: Contact): boolean => 
  contact.categories.includes('Empresa');

export const isSupplier = (contact: Contact): boolean => 
  contact.categories.includes('Fornecedor');

export const isGuarantor = (contact: Contact): boolean => 
  contact.categories.includes('Fiador');

/**
 * Adiciona uma categoria a um contato (imutável)
 */
export const addCategory = (contact: Contact, category: ContactCategory): ContactCategory[] => {
  if (contact.categories.includes(category)) {
    return contact.categories;
  }
  return [...contact.categories, category];
};

/**
 * Remove uma categoria de um contato (imutável)
 */
export const removeCategory = (contact: Contact, category: ContactCategory): ContactCategory[] => {
  return contact.categories.filter(c => c !== category);
};
