
# Memory: auth/rbac-roles
Updated: now

O sistema utiliza um modelo de permissões RBAC com cinco níveis:
- **Super Admin**: Acesso total — gestão global, roles, créditos, planos, suporte. Único que pode alterar roles.
- **Admin**: Gestão de planos, créditos e limites via Cockpit. NÃO pode alterar roles.
- **Moderator**: CRUD de conteúdos na aba Treinamentos (Slotimob Academy).
- **Support**: Visualização somente-leitura de usuários, planos e audit logs. Pode ativar sessões de debug.
- **Assinante (sem role)**: Usuário comum. Ausência de role na tabela `user_roles` = cliente.

O Cockpit Master é acessível por super_admin, admin e support (com abas visíveis conforme a role).
Restrições por plano: O plano 'Essencial' oculta a gestão de equipe; no plano 'Pro', o convite de usuários redireciona para upgrade ao plano 'Business'.
