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
import { AlertTriangle, Check, HelpCircle, Lock, X } from 'lucide-react';
import type { Permissions, ModulePermission } from '@/hooks/usePermissions';
import { EMPTY_MODULE_PERMISSION } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ActionKey = keyof ModulePermission;

export interface PermissionModuleDef {
  key: string;
  label: string;
  actions: ActionKey[];
  isGroupHeader?: boolean;
  indent?: boolean;
}

export const PERMISSION_MODULES: PermissionModuleDef[] = [
  // Dashboard
  { key: 'dashboard', label: 'Dashboard', actions: ['view', 'edit'] },

  // Chat IA
  { key: 'chat', label: 'Chat IA', actions: ['view'] },

  // Gestão group
  { key: '_group_management', label: 'Gestão', actions: [], isGroupHeader: true },
  { key: 'management_proposals', label: 'Propostas Comerciais', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'management_rentals', label: 'Aluguéis', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'management_contracts', label: 'Contratos', actions: ['view', 'create', 'edit', 'delete'], indent: true },
  { key: 'management_boletos', label: 'Boletos', actions: ['view', 'create', 'edit', 'delete'], indent: true },
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
  { key: 'finance_bank_accounts', label: 'Bancos', actions: ['view', 'create', 'edit', 'delete'], indent: true },
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

  // Admin — always last
  { key: '_group_admin', label: 'Administração', actions: [], isGroupHeader: true },
  { key: 'manage_team_permissions', label: 'Gerenciar Permissões da Equipe', actions: ['edit'], indent: true },
];

const MODULE_TOOLTIPS: Record<string, string> = {
  dashboard: 'Ao liberar a visualização, o utilizador poderá ver movimentos financeiros e métricas de CRM globais.',
  crm_admin: 'Ao ativar, o membro verá TODAS as negociações e atividades da equipa, não apenas as que lhe foram atribuídas.',
  reports: 'Ao liberar a visualização, o utilizador poderá exportar todos os relatórios da imobiliária, incluindo dados financeiros.',
  integrations: 'Ao liberar, o utilizador terá a opção de conectar o seu próprio WhatsApp no módulo CRM.',
  manage_team_permissions: 'Conceda com cautela. Permite delegar edição parcial de permissões a outros membros, limitada aos módulos que o próprio delegado possui.',
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
  readOnly?: boolean;
  grantableScope?: Permissions;
}

export function PermissionsMatrix({ permissions, onChange, disabled, readOnly, grantableScope }: PermissionsMatrixProps) {
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

  const isActionGrantable = (moduleKey: string, action: ActionKey): boolean => {
    if (!grantableScope) return true; // no scope restriction
    return grantableScope[moduleKey]?.[action] === true;
  };

  const toggle = (moduleKey: string, action: ActionKey, checked: boolean) => {
    if (readOnly) return;
    const current = getModulePerms(moduleKey);

    if (action === 'view' && !checked) {
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
      <div className="space-y-3">
        {readOnly && (
          <Alert variant="default" className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400 text-sm">
              Você não tem permissão para alterar permissões da equipe. Solicite ao administrador da conta.
            </AlertDescription>
          </Alert>
        )}
        {!readOnly && grantableScope && (
          <Alert variant="default" className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
            <Lock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
              Você está editando como delegado. Pode conceder somente permissões que você mesmo possui.
            </AlertDescription>
          </Alert>
        )}
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
                const isAdminModule = mod.key === 'manage_team_permissions';

                return (
                  <TableRow key={mod.key} className={isAdminModule ? 'bg-amber-50/30 dark:bg-amber-950/10' : undefined}>
                    <TableCell className={`font-medium text-sm ${mod.indent ? 'pl-6' : ''}`}>
                      <span className="inline-flex items-center gap-1">
                        {isAdminModule && <Lock className="h-3.5 w-3.5 text-amber-600" />}
                        {mod.label}
                        {MODULE_TOOLTIPS[mod.key] && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[260px]">
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

                      const checked = perms[col.key];

                      // Read-only mode: show static icons
                      if (readOnly) {
                        return (
                          <TableCell key={col.key} className="text-center">
                            {checked ? (
                              <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/50 mx-auto" />
                            )}
                          </TableCell>
                        );
                      }

                      const isView = col.key === 'view';
                      const grantable = isActionGrantable(mod.key, col.key);
                      const isDisabled = disabled || (!isView && !viewEnabled) || !grantable;

                      return (
                        <TableCell key={col.key} className="text-center">
                          {!grantable ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Checkbox
                                    checked={checked}
                                    disabled
                                    className="opacity-40"
                                  />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isAdminModule ? 'Delegados não podem conceder este módulo.' : 'Você não tem essa permissão para conceder.'}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => toggle(mod.key, col.key, v === true)}
                              disabled={isDisabled}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
