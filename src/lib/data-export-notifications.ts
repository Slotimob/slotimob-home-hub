import { supabase } from '@/integrations/supabase/client';

interface ExportRequest {
  id: string;
  organization_owner_id: string;
  reason: string;
  expected_by: string;
  admin_note?: string;
}

export async function notifyExportCreated(request: ExportRequest) {
  try {
    const { data: owner } = await supabase
      .from('profile_directory' as any)
      .select('full_name, email')
      .eq('id', request.organization_owner_id)
      .single();

    if (owner?.email) {
      const expectedDate = new Date(request.expected_by).toLocaleDateString('pt-BR');
      await supabase.from('email_notifications').insert({
        broker_id: request.organization_owner_id,
        recipient_email: owner.email,
        subject: 'Solicitação de exportação recebida',
        email_type: 'data_export_requested',
        metadata: {
          body: `Olá ${owner.full_name || ''},\n\nSua solicitação de exportação de dados foi recebida com sucesso.\n\nPrazo previsto de entrega: ${expectedDate}\n\nVocê receberá um e-mail quando a exportação estiver pronta para download.\n\nEquipe SLOTIMOB`,
        },
      });
    }

    // Notify admins
    const { data: admins } = await supabase
      .from('profile_directory' as any)
      .select('id, email')
      .eq('is_super_admin', true);

    for (const admin of admins || []) {
      if (admin.email) {
        await supabase.from('email_notifications').insert({
          broker_id: admin.id,
          recipient_email: admin.email,
          subject: `Nova solicitação de exportação — ${owner?.full_name || owner?.email || 'Cliente'}`,
          email_type: 'data_export_admin_notification',
          metadata: {
            body: `Nova solicitação de exportação de dados.\n\nCliente: ${owner?.full_name || ''} (${owner?.email || ''})\nMotivo: ${getReasonLabel(request.reason)}\n\nAcesse: https://slotimob.com.br/admin/data-requests`,
          },
        });
      }
    }
  } catch (err) {
    console.error('Error sending export notifications:', err);
  }
}

export async function notifyPreparationStarted(request: ExportRequest) {
  try {
    const { data: owner } = await supabase
      .from('profile_directory' as any)
      .select('full_name, email')
      .eq('id', request.organization_owner_id)
      .single();

    if (owner?.email) {
      const expectedDate = new Date(request.expected_by).toLocaleDateString('pt-BR');
      await supabase.from('email_notifications').insert({
        broker_id: request.organization_owner_id,
        recipient_email: owner.email,
        subject: 'Sua exportação está sendo processada',
        email_type: 'data_export_in_preparation',
        metadata: {
          body: `Olá ${owner.full_name || ''},\n\nSua solicitação de exportação de dados está sendo processada pela nossa equipe.\n\nPrazo previsto: ${expectedDate}\n\nVocê receberá um e-mail assim que estiver pronta.\n\nEquipe SLOTIMOB`,
        },
      });
    }
  } catch (err) {
    console.error('Error sending preparation notification:', err);
  }
}

export async function notifyExportRejected(request: ExportRequest) {
  try {
    const { data: owner } = await supabase
      .from('profile_directory' as any)
      .select('full_name, email')
      .eq('id', request.organization_owner_id)
      .single();

    if (owner?.email) {
      await supabase.from('email_notifications').insert({
        broker_id: request.organization_owner_id,
        recipient_email: owner.email,
        subject: 'Solicitação de exportação recusada',
        email_type: 'data_export_rejected',
        metadata: {
          body: `Olá ${owner.full_name || ''},\n\nSua solicitação de exportação de dados foi recusada.\n\nMotivo: ${request.admin_note || 'Não especificado'}\n\nSe precisar de mais informações, entre em contato com nosso suporte.\n\nEquipe SLOTIMOB`,
        },
      });
    }
  } catch (err) {
    console.error('Error sending rejection notification:', err);
  }
}

export const REASON_LABELS: Record<string, string> = {
  backup: 'Backup pessoal',
  migration: 'Migração para outra plataforma',
  account_closure: 'Encerramento de conta',
  legal_audit: 'Auditoria interna',
  lgpd_portability: 'Direito de portabilidade (LGPD)',
  other: 'Outro',
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  requested: { label: 'Recebida', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  in_preparation: { label: 'Em preparação', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  ready: { label: 'Pronta para entrega', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  rejected: { label: 'Recusada', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  expired: { label: 'Expirada', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
};

function getReasonLabel(reason: string): string {
  return REASON_LABELS[reason] || reason;
}
