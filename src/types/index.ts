/**
 * Arquivo central de tipos do sistema
 * 
 * Exporta todas as interfaces e tipos utilizados no projeto.
 */

// Sistema unificado de contatos
export * from './contact';

// Re-exportar tipos do Supabase para conveniência
export type { Database, Json } from '@/integrations/supabase/types';
