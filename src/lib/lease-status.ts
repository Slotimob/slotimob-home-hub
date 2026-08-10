export interface LeaseStatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const LEASE_STATUS_LABELS: Record<string, LeaseStatusConfig> = {
  active: { label: 'Ativo', variant: 'default' },
  pending: { label: 'Pendente de Configuração', variant: 'secondary' },
  pending_signature: { label: 'Aguardando Assinatura', variant: 'secondary' },
  expired: { label: 'Expirado', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
  terminated: { label: 'Encerrado', variant: 'outline' },
};
