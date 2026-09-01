import { AlertTriangle, Layers } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUnitSubdivisions } from '@/hooks/useUnitSubdivisions';

type IntentLike = string | null | undefined;

export function intentIncludesRental(intent: IntentLike): boolean {
  return intent === 'rental' || intent === 'both';
}

interface BaseProps {
  /** Ação direta para o cadastro de frações (ex.: abrir a aba Frações). */
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

interface SubdivisionSetupAlertProps extends BaseProps {
  /** Total de frações cadastradas. */
  total: number;
  /** Frações sem inquilino vinculado. */
  missing: number;
}

/**
 * Aviso âmbar padrão do projeto: frações pendentes não geram contrato.
 * Renderiza `null` quando não há pendência.
 */
export function SubdivisionSetupAlert({
  total,
  missing,
  onAction,
  actionLabel = 'Cadastrar frações',
  className,
}: SubdivisionSetupAlertProps) {
  if (total > 0 && missing === 0) return null;

  const message =
    total === 0
      ? 'Nenhuma fração cadastrada ainda. Enquanto isso, nenhum contrato é criado para este imóvel.'
      : `${missing} de ${total} ${total === 1 ? 'fração ainda está' : 'frações ainda estão'} sem inquilino. Enquanto isso, ${missing === 1 ? 'ela não gera' : 'elas não geram'} contrato.`;

  return (
    <Alert
      className={`border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ${className ?? ''}`}
    >
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Frações pendentes de cadastro
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-amber-900 dark:text-amber-100" style={{ textWrap: 'pretty' } as any}>
          {message} O contrato de cada inquilino só é criado depois que a fração dele for
          cadastrada com o inquilino vinculado.
        </span>
        {onAction && (
          <Button size="sm" variant="outline" className="shrink-0" onClick={onAction}>
            <Layers className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface UnitSubdivisionSetupAlertProps extends BaseProps {
  unitId: string;
  hasSubdivisions: boolean | null | undefined;
  intentType: IntentLike;
}

/** Versão conectada: busca as frações da unidade e decide se há pendência. */
export function UnitSubdivisionSetupAlert({
  unitId,
  hasSubdivisions,
  intentType,
  ...rest
}: UnitSubdivisionSetupAlertProps) {
  const enabled = !!hasSubdivisions && intentIncludesRental(intentType);
  const { data: subdivisions = [] } = useUnitSubdivisions(enabled ? unitId : '');

  if (!enabled) return null;

  const total = subdivisions.length;
  const missing = subdivisions.filter((s) => !s.tenant_contact_id).length;

  return <SubdivisionSetupAlert total={total} missing={missing} {...rest} />;
}

/** Aviso estático usado no formulário, antes de existirem frações salvas. */
export function SubdivisionFormHint({ onAction, actionLabel }: BaseProps) {
  return (
    <Alert className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Cadastre as frações para gerar os contratos
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-amber-900 dark:text-amber-100" style={{ textWrap: 'pretty' } as any}>
          Imóveis subdivididos não geram um contrato próprio. O contrato de cada inquilino só é
          criado depois que a fração dele for cadastrada, na aba <strong>Frações</strong>, com o
          inquilino vinculado.
        </span>
        {onAction && (
          <Button size="sm" variant="outline" className="shrink-0" onClick={onAction}>
            <Layers className="mr-2 h-4 w-4" />
            {actionLabel ?? 'Cadastrar frações'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
