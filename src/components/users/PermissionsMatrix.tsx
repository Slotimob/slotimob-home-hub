import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import type { Permissions, ModulePermission } from '@/hooks/usePermissions';
import { EMPTY_MODULE_PERMISSION } from '@/hooks/usePermissions';

type ActionKey = keyof ModulePermission;

export interface PermissionModuleDef {
  key: string;
  label: string;
  /** Which actions are available for this module. Missing actions render as "—" */
  actions: ActionKey[];
  /** If true, renders as a group header row */
  isGroupHeader?: boolean;
  /** Indentation level for sub-items */
  indent?: boolean;
}

/**
 * Grouped permission modules for the enterprise RBAC matrix.
 * Group headers are non-interactive label rows.
 */
export const PERMISSION_MODULES: PermissionModuleDef[] = [
  // Dashboard
  { key: 'dashboard', label: 'Dashboard', actions: ['view', 'edit'] },

  // Chat IA
  { key: 'chat', label: 'Chat IA', actions: ['view'] },

  // Gestão group
  { key: '_group_management', label: 'Gestão', actions: [], isGroupHeader: true },
  { key: 'management_rentals', label: 'Aluguéis', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'management_contracts', label: 'Contratos', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'management_reports', label: 'Gerencial', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'management_tasks', label: 'Afazeres', actions: ['view', 'create', 'edit', 'delete'], indent: true },

  // Ativos group
  { key: '_group_assets', label: 'Ativos', actions: [], isGroupHeader: true },
  { key: 'assets_properties', label: 'Empreendimentos', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'assets_units', label: 'Unidades', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'assets_standalone', label: 'Imóveis Avulsos', actions: ['view', 'create', 'edit', 'delete'], indent: true },

  // Financeiro group
  { key: '_group_finance', label: 'Financeiro', actions: [], isGroupHeader: true },
  { key: 'finance_overview', label: 'Visão Geral', actions: ['view'], indent: true },
  { key: 'finance_transactions', label: 'Lançamentos', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'finance_dre', label: 'DRE', actions: ['view'], indent: true },
  { key: 'finance_reconciliation', label: 'Conciliação', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'finance_categories', label: 'Categorias', actions: ['view', 'create', 'edit', 'delete'], indent: true },

  // CRM group
  { key: '_group_crm', label: 'CRM', actions: [], isGroupHeader: true },
  { key: 'crm_admin', label: 'Admin CRM (Ver tudo)', actions: ['view'], indent: true },
  { key: 'crm_pipeline', label: 'Pipeline', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'crm_contacts', label: 'Contatos', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'crm_schedule', label: 'Agenda', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'crm_whatsapp', label: 'WhatsApp', actions: ['view', 'create', 'edit', 'delete'], indent: true },

  // Others
  { key: 'reports', label: 'Relatórios', actions: ['view'] },
  { key: 'documents', label: 'Documentos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'integrations', label: 'Integrações', actions: ['view'] },
];

/** Alert tooltips for specific modules to warn the Master about data exposure */
const MODULE_TOOLTIPS: Record<string, string> = {
  dashboard: 'Ao liberar a visualização, o utilizador poderá ver movimentos financeiros e métricas de CRM globais.',
  reports: 'Ao liberar a visualização, o utilizador poderá exportar todos os relatórios da imobiliária, incluindo dados financeiros.',
  integrations: 'Ao liberar, o utilizador terá a opção de conectar o seu próprio WhatsApp no módulo CRM.',
};

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
    <TooltipProvider>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">Módulo</TableHead>
            {ACTION_COLUMNS.map((col) => (
              <TableHead key={col.key} className="text-center w-[90px]">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_MODULES.map((mod) => {
            // Group header row
            if (mod.isGroupHeader) {
              return (
                <TableRow key={mod.key} className="bg-muted/50">
                  <TableCell colSpan={5} className="font-semibold text-sm py-2">
                    {mod.label}
                  </TableCell>
                </TableRow>
              );
            }

            const perms = getModulePerms(mod.key);
            const viewEnabled = perms.view;

            return (
              <TableRow key={mod.key}>
                <TableCell className={`font-medium text-sm ${mod.indent ? 'pl-6' : ''}`}>
                  <span className="inline-flex items-center gap-1">
                    {mod.label}
                    {MODULE_TOOLTIPS[mod.key] && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{MODULE_TOOLTIPS[mod.key]}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </span>
                </TableCell>
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
    </TooltipProvider>
  );
}
