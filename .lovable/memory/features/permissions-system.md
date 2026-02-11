
# Memory: features/permissions-system
Updated: now

## Sistema de Permissões Granulares (Plano Business)

### Arquitetura
- **`organization_members`**: Tabela com `permissions` JSONB, `role_label`, `is_active`, vinculada ao `organization_owner_id`.
- **`role_templates`**: Templates de permissão pré-definidos (Corretor, Supervisor Financeiro, Gerente, Administrador) + suporte a templates customizados por broker.
- **`check_member_permission(user_id, module, action)`**: Função SQL SECURITY DEFINER para uso em RLS futuro.

### Módulos e Ações
- **Ativos**: read, create, edit, delete, manage
- **CRM**: read, read_all, move_pipeline, delete
- **Financeiro**: read, create, dre, reconciliation
- **Documentos**: generate, read, delete

### Frontend
- **`usePermissions` hook**: `hasPermission(module, action)` e `can()` — owners têm acesso total.
- **`PermissionGate` component**: Wrapper declarativo `<PermissionGate permission="module.action">`.
- **Integrado em**: Pipeline (Nova Negociação), FinanceTransactions (Novo Lançamento), Documents (Nova Proposta, Excluir), RealEstate (Novo Imóvel).

### Backend
- **Edge function `check-permission`**: Validação server-side via JWT + JSONB lookup. Retorna `{allowed, reason}`.
- **`checkPermissionServer(module, action)`**: Utility client-side para chamar a edge function antes de mutations sensíveis.

### UI de Gestão (/users - Plano Business)
- Lista de membros com cards expansíveis e matriz de checkboxes por módulo.
- Botão "Aplicar Template" para preencher checkboxes automaticamente.
- Toggle ativar/desativar membro.
- Dialog de convite com email + permissões.
