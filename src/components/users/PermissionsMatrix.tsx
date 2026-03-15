import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Permissions, ModulePermission } from '@/hooks/usePermissions';
import { EMPTY_MODULE_PERMISSION } from '@/hooks/usePermissions';

type ActionKey = keyof ModulePermission;

export interface PermissionModuleDef {
  key: string;
  label: string;
  /** Which actions are available for this module. Missing actions render as "—" */
  actions: ActionKey[];
}

export const PERMISSION_MODULES: PermissionModuleDef[] = [
  { key: 'chat', label: 'Chat IA', actions: ['view'] },
  { key: 'dashboard', label: 'Dashboard', actions: ['view', 'edit'] },
  { key: 'management', label: 'Gestão', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'assets', label: 'Ativos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'financial', label: 'Financeiro', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'crm', label: 'CRM', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'reports', label: 'Relatórios', actions: ['view'] },
  { key: 'documents', label: 'Documentos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'integrations', label: 'Integrações', actions: ['view', 'create', 'edit', 'delete'] },
];

const ACTION_COLUMNS: { key: ActionKey; label: string }[] = [
  { key: 'view', label: 'Visualizar' },
  { key: 'create', label: 'Criar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
];

interface PermissionsMatrixProps {
  permissions: Permissions;
  onChange: (permissions: Permissions) => void;
  disabled?: boolean;
}

export function PermissionsMatrix({ permissions, onChange, disabled }: PermissionsMatrixProps) {
  const getModulePerms = (moduleKey: string): ModulePermission => {
    const raw = permissions[moduleKey];
    if (!raw) return { ...EMPTY_MODULE_PERMISSION };
    return {
      view: raw.view === true,
      create: raw.create === true,
      edit: raw.edit === true,
      delete: raw.delete === true,
    };
  };

  const toggle = (moduleKey: string, action: ActionKey, checked: boolean) => {
    const current = getModulePerms(moduleKey);

    if (action === 'view' && !checked) {
      // Unchecking view disables all other actions
      onChange({
        ...permissions,
        [moduleKey]: { view: false, create: false, edit: false, delete: false },
      });
    } else {
      onChange({
        ...permissions,
        [moduleKey]: { ...current, [action]: checked },
      });
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Módulo</TableHead>
            {ACTION_COLUMNS.map((col) => (
              <TableHead key={col.key} className="text-center w-[90px]">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_MODULES.map((mod) => {
            const perms = getModulePerms(mod.key);
            const viewEnabled = perms.view;

            return (
              <TableRow key={mod.key}>
                <TableCell className="font-medium text-sm">{mod.label}</TableCell>
                {ACTION_COLUMNS.map((col) => {
                  const hasAction = mod.actions.includes(col.key);

                  if (!hasAction) {
                    return (
                      <TableCell key={col.key} className="text-center">
                        <span className="text-muted-foreground text-xs">—</span>
                      </TableCell>
                    );
                  }

                  const isView = col.key === 'view';
                  const isDisabled = disabled || (!isView && !viewEnabled);
                  const checked = perms[col.key];

                  return (
                    <TableCell key={col.key} className="text-center">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggle(mod.key, col.key, v === true)}
                        disabled={isDisabled}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
