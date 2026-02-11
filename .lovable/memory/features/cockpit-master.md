
# Memory: features/cockpit-master
Updated: now

O Cockpit Master (`/admin/cockpit`) é um painel de gestão global com acesso baseado em roles (super_admin, admin, support). Possui layout com abas:

1. **Visão Geral** (admin + super_admin): Cards com métricas globais (organizações, assinaturas ativas, trials).
2. **Organizações** (admin + super_admin): Tabela com busca, exibindo plano, status, unidades, créditos. Ações: alterar plano, adicionar créditos, ajustar limites.
3. **Roles** (APENAS super_admin): Gerenciamento de roles (super_admin, admin, moderator, support) com toggle switches.
4. **Suporte** (support + admin + super_admin): Busca de usuários por email/nome, ficha detalhada com métricas, timeline de audit logs.

Todas as ações administrativas são registradas na tabela `admin_actions_logs`. O hook `useCockpitAccess` gerencia a hierarquia de acesso e determina quais abas são visíveis.
