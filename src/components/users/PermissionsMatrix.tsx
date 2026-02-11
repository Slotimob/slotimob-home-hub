import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Permissions } from '@/hooks/usePermissions';

export interface PermissionModule {
  key: string;
  label: string;
  actions: { key: string; label: string }[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'assets',
    label: 'Ativos',
    actions: [
      { key: 'read', label: 'Ver' },
      { key: 'create', label: 'Cadastrar' },
      { key: 'edit', label: 'Editar' },
      { key: 'delete', label: 'Excluir' },
      { key: 'manage', label: 'Gerenciar' },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    actions: [
      { key: 'read', label: 'Ver leads' },
      { key: 'read_all', label: 'Ver todos os leads' },
      { key: 'move_pipeline', label: 'Mover funil' },
      { key: 'delete', label: 'Excluir contatos' },
    ],
  },
  {
    key: 'financial',
    label: 'Financeiro',
    actions: [
      { key: 'read', label: 'Ver visão geral' },
      { key: 'create', label: 'Lançar despesas' },
      { key: 'dre', label: 'Ver DRE' },
      { key: 'reconciliation', label: 'Conciliação bancária' },
    ],
  },
  {
    key: 'documents',
    label: 'Documentos',
    actions: [
      { key: 'generate', label: 'Gerar contratos' },
      { key: 'read', label: 'Ver histórico' },
      { key: 'delete', label: 'Excluir modelos' },
    ],
  },
];

interface PermissionsMatrixProps {
  permissions: Permissions;
  onChange: (permissions: Permissions) => void;
  disabled?: boolean;
}

export function PermissionsMatrix({ permissions, onChange, disabled }: PermissionsMatrixProps) {
  const toggle = (module: string, action: string, checked: boolean) => {
    const updated = { ...permissions };
    if (!updated[module]) updated[module] = {};
    updated[module] = { ...updated[module]!, [action]: checked };
    onChange(updated);
  };

  return (
    <div className="space-y-5">
      {PERMISSION_MODULES.map((mod) => (
        <div key={mod.key}>
          <h4 className="text-sm font-semibold mb-2 text-foreground">{mod.label}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {mod.actions.map((action) => {
              const checked = permissions[mod.key]?.[action.key] === true;
              const id = `${mod.key}-${action.key}`;
              return (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(v) => toggle(mod.key, action.key, v === true)}
                    disabled={disabled}
                  />
                  <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                    {action.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
