/**
 * Tipos de atividade usados no módulo Manutenções (property_activities.activity_type).
 * Campo texto livre no banco — esta lista é a fonte de verdade da UI/relatórios.
 */
export const ACTIVITY_TYPES = [
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'mudanca', label: 'Mudança' },
  { value: 'visita', label: 'Visita' },
  { value: 'reforma', label: 'Reforma' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'vistoria', label: 'Vistoria' },
  { value: 'nota', label: 'Nota' },
  { value: 'outro', label: 'Outro' },
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = ACTIVITY_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<string, string>,
);

export function activityTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Atividade';
  return ACTIVITY_TYPE_LABELS[type] || type;
}
