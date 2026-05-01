export type BulkActionType =
  | 'bulk_delete'
  | 'bulk_update'
  | 'bulk_import'
  | 'bulk_export'
  | 'bulk_message_send'
  | 'bulk_billing_create'
  | 'bulk_status_change'
  | 'bulk_assignment_transfer'
  | 'bulk_document_delete'
  | 'bulk_lease_termination';

export const ACTION_TYPE_LABELS: Record<BulkActionType, string> = {
  bulk_delete: 'Exclusão em massa',
  bulk_update: 'Edição em massa',
  bulk_import: 'Importação de dados',
  bulk_export: 'Exportação de dados',
  bulk_message_send: 'Envio de mensagens em massa',
  bulk_billing_create: 'Geração de cobranças em massa',
  bulk_status_change: 'Mudança de status em massa',
  bulk_assignment_transfer: 'Transferência/atribuição em massa',
  bulk_document_delete: 'Exclusão de documentos em massa',
  bulk_lease_termination: 'Encerramento de contratos em massa',
};

export const ACTION_TYPE_ORDER: BulkActionType[] = [
  'bulk_delete',
  'bulk_update',
  'bulk_import',
  'bulk_export',
  'bulk_message_send',
  'bulk_billing_create',
  'bulk_status_change',
  'bulk_assignment_transfer',
  'bulk_document_delete',
  'bulk_lease_termination',
];

export const DEFAULT_THRESHOLDS: Record<BulkActionType, number> = {
  bulk_delete: 5,
  bulk_update: 10,
  bulk_import: 100,
  bulk_export: 50,
  bulk_message_send: 10,
  bulk_billing_create: 10,
  bulk_status_change: 20,
  bulk_assignment_transfer: 10,
  bulk_document_delete: 5,
  bulk_lease_termination: 3,
};
