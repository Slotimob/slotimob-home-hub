import { supabase } from '@/integrations/supabase/client';

/**
 * Chaves de upload da jornada do contrato que devem gerar
 * também uma linha na tabela unificada `documents`.
 */
export type LeaseDocumentKey =
  | 'signed_contract'
  | 'entry_inspection'
  | 'exit_inspection'
  | 'closing_documents'
  | 'key_return';

const LEASE_DOC_META: Record<
  LeaseDocumentKey,
  { label: string; documentType: 'contract' | 'property_doc' | 'other' }
> = {
  signed_contract: { label: 'Contrato Assinado', documentType: 'contract' },
  entry_inspection: { label: 'Vistoria de Entrada', documentType: 'property_doc' },
  exit_inspection: { label: 'Vistoria de Saída', documentType: 'property_doc' },
  closing_documents: { label: 'Documentos de Encerramento', documentType: 'other' },
  key_return: { label: 'Devolução de Chaves', documentType: 'other' },
};

export const isLeaseDocumentKey = (key: string): key is LeaseDocumentKey =>
  key in LEASE_DOC_META;

interface RegisterLeaseDocumentParams {
  key: LeaseDocumentKey;
  brokerId: string | null | undefined;
  filePath: string;
  unitId?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  /** Nome de referência (inquilino / unidade) usado no título */
  reference?: string | null;
}

/**
 * Cria (ou substitui) a linha correspondente em `documents`.
 * É um ACRÉSCIMO: a escrita em `leases` continua sendo a fonte da jornada.
 * Falhas aqui não devem quebrar o upload — apenas logamos.
 */
export async function registerLeaseDocument({
  key,
  brokerId,
  filePath,
  unitId,
  fileSize,
  mimeType,
  reference,
}: RegisterLeaseDocumentParams): Promise<void> {
  if (!brokerId || !filePath) return;

  const meta = LEASE_DOC_META[key];
  const title = reference ? `${meta.label} — ${reference}` : meta.label;

  try {
    // Evita duplicidade quando o mesmo arquivo é reenviado
    await supabase.from('documents').delete().eq('broker_id', brokerId).eq('file_path', filePath);

    const { error } = await supabase.from('documents').insert({
      broker_id: brokerId,
      unit_id: unitId ?? null,
      document_type: meta.documentType,
      source_type: 'upload',
      title,
      description: meta.label,
      file_path: filePath,
      file_size: fileSize ?? null,
      mime_type: mimeType ?? null,
    });

    if (error) throw error;
  } catch (error) {
    console.error('[registerLeaseDocument] falha ao registrar documento unificado', error);
  }
}

/** Remove a linha em `documents` que aponta para o arquivo removido. */
export async function unregisterLeaseDocument(
  brokerId: string | null | undefined,
  filePath: string | null | undefined,
): Promise<void> {
  if (!brokerId || !filePath) return;
  try {
    await supabase.from('documents').delete().eq('broker_id', brokerId).eq('file_path', filePath);
  } catch (error) {
    console.error('[unregisterLeaseDocument] falha ao remover documento unificado', error);
  }
}
