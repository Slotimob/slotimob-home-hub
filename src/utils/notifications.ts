import { toast } from '@/hooks/use-toast';

/**
 * Default toast duration in milliseconds (3 seconds as requested)
 */
const DEFAULT_DURATION = 3000;

/**
 * Shows a success toast notification.
 * Centralizes all success messages to ensure consistent UX.
 * 
 * @param title - Main message title
 * @param description - Optional detailed description
 */
export function showSuccess(title: string, description?: string) {
  return toast({
    title,
    description,
    duration: DEFAULT_DURATION,
  });
}

/**
 * Shows an error toast notification.
 * Centralizes all error messages to ensure consistent UX.
 * 
 * @param title - Main error title
 * @param description - Optional error details
 */
export function showError(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'destructive',
    duration: DEFAULT_DURATION,
  });
}

/**
 * Shows a warning toast notification.
 * 
 * @param title - Main warning title
 * @param description - Optional warning details
 */
export function showWarning(title: string, description?: string) {
  return toast({
    title,
    description,
    // Using default variant with slightly different duration
    duration: DEFAULT_DURATION + 1000,
  });
}

/**
 * Shows an info toast notification.
 * 
 * @param title - Main info title
 * @param description - Optional info details
 */
export function showInfo(title: string, description?: string) {
  return toast({
    title,
    description,
    duration: DEFAULT_DURATION,
  });
}

/**
 * Standard success messages for common operations
 */
export const SuccessMessages = {
  SAVED: { title: 'Salvo com sucesso!', description: 'As alterações foram salvas.' },
  CREATED: { title: 'Criado com sucesso!', description: 'O registro foi criado.' },
  UPDATED: { title: 'Atualizado!', description: 'As alterações foram aplicadas.' },
  DELETED: { title: 'Excluído!', description: 'O registro foi removido.' },
  UPLOADED: { title: 'Enviado!', description: 'O arquivo foi enviado com sucesso.' },
} as const;

/**
 * Standard error messages for common operations
 */
export const ErrorMessages = {
  GENERIC: { title: 'Erro', description: 'Algo deu errado. Tente novamente.' },
  VALIDATION: { title: 'Erro de validação', description: 'Verifique os campos obrigatórios.' },
  NETWORK: { title: 'Erro de conexão', description: 'Verifique sua internet.' },
  UNAUTHORIZED: { title: 'Não autorizado', description: 'Você não tem permissão para esta ação.' },
} as const;
