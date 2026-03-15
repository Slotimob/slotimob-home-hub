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

export interface PermissionModuleDef {
  key: string;
  label: string;
}

export const PERMISSION_MODULES: PermissionModuleDef[] = [
  { key: 'crm', label: 'CRM' },
  { key: 'properties', label: 'Imóveis / Ativos' },
  { key: 'management', label: 'Gestão' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'integrations', label: 'Integrações' },
];

const ACTION_COLUMNS: { key: keyof ModulePermission; label: string }[] = [
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

  const toggle = (moduleKey: string, action: keyof ModulePermission, checked: boolean) => {
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
