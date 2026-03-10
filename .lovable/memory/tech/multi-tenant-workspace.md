
# Memory: tech/multi-tenant-workspace
Updated: now

## Arquitetura Multi-Tenant (Plano Business)

### Funções SQL (Security Definer)
- **`get_workspace_user_ids(user_id)`**: Retorna array com todos os IDs do workspace (Owner + Membros ativos). Usado nas políticas RLS de SELECT/UPDATE/DELETE.
- **`get_effective_broker_id(user_id)`**: Retorna o ID do Owner para membros, ou o próprio ID para owners/standalone. Usado para herança de assinatura.
- **`can_write_as_broker(user_id, broker_id)`**: Valida se o usuário pode inserir dados com o broker_id fornecido (próprio ou do owner). Usado em INSERT policies.

### RLS Policies
Todas as tabelas principais (properties, units, contacts, deals, leads, financial_transactions, leases, deal_activities, deal_tasks, deal_stage_history, bank_accounts, financial_categories, documents, generated_documents, lease_adjustments, sales) usam:
- **SELECT/UPDATE/DELETE**: `broker_id = ANY(get_workspace_user_ids(auth.uid()))`
- **INSERT**: `can_write_as_broker(auth.uid(), broker_id)` — aceita tanto o ID do próprio membro quanto o ID do owner

### Frontend
- **`useWorkspace` hook**: Fornece `effectiveBrokerId` (owner ID para membros), `isMember`, `ownerId`.
- **Inserts**: Componentes críticos (CreateContact, CreateUnit, CreateDeal, Pipeline) usam `effectiveBrokerId` para `broker_id`.
- **SELECTs**: RLS filtra automaticamente; queries sem `.eq('broker_id')` mostram dados do workspace inteiro.

### Herança de Assinatura
- `get_user_plan_features()` e `get_user_trial_status()` resolvem o owner via `get_effective_broker_id()`, garantindo que membros herdam o plano Business do master.
- `useSubscriptionLimits` usa `effectiveBrokerId` para addons.

### Menu "Equipe"
- Item "Usuários" no sidebar não tem mais `ownerOnly: true`, permitindo que membros acessem `/users` em modo leitura.

### Padrão para Migração de Arquivos Restantes
Ainda há ~30 arquivos com `broker_id: user.id` em inserts que devem ser migrados para `effectiveBrokerId`. A política INSERT flexível (`can_write_as_broker`) garante que não haverá erros até que sejam migrados.
