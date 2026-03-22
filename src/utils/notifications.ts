import { toast } from '@/hooks/use-toast';

/**
 * Shows a success toast notification.
 * Uses global duration from use-toast.ts (1000ms).
 */
export function showSuccess(title: string, description?: string) {
  return toast({ title, description });
}

/**
 * Shows an error toast notification.
 */
export function showError(title: string, description?: string) {
  return toast({ title, description, variant: 'destructive' });
}

/**
 * Shows a warning toast notification.
 */
export function showWarning(title: string, description?: string) {
  return toast({ title, description });
}

/**
 * Shows an info toast notification.
 */
export function showInfo(title: string, description?: string) {
  return toast({ title, description });
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
