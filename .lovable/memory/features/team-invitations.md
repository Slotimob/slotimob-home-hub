
# Memory: features/team-invitations
Updated: now

## Fluxo de Convite por Token

O sistema de convites de equipe utiliza tokens UUID com expiração de 48h, armazenados na tabela `organization_invitations`.

### Fluxo:
1. **Owner** (assinante Business sem role) clica em "Convidar Membro" → `InviteMemberDialog` chama a Edge Function `send-invite-email`
2. A Edge Function valida: plano Business, limites de usuários (base + add-ons), duplicidades
3. Resend envia email com link: `https://slotimob.com.br/auth?token=UUID`
4. Convidado acessa `/auth?token=UUID` → tab "Criar Conta" ativa, email bloqueado (read-only)
5. Após signup, a Edge Function `accept-invite` é chamada: valida token, cria `organization_members`, marca token como usado

### Regras de negócio:
- Apenas o assinante (sem role em `user_roles`) pode convidar
- Limite validado: membros ativos + convites pendentes < `users_limit` + `extra_users_count`
- Token expira em 48h e é single-use
- Email do convite deve corresponder ao email da conta criada

### Domínio oficial:
- Todos os redirects de autenticação apontam para `https://slotimob.com.br`
- Emails enviados via Resend com remetente `noreply@slotimob.com.br`
