# Diagnóstico: duplicação de contratos + aba Inquilinos por contrato

## PEDIDO 1 — Duplicação do lease pending (causa confirmada)

Causa raiz: **incompatibilidade de nome do query param**.

- `src/components/units/UnitContractTab.tsx:166` navega para `/gestao/contratos/novo?editLeaseId=${lease.id}`
- `src/pages/gestao/NovoContrato.tsx:115` lê `searchParams.get("edit")` — chave diferente
- Logo `isEditMode` (`NovoContrato.tsx:163`) é sempre `false` nesse fluxo; a query de edição (`:166-180`) nunca roda
- No submit (`NovoContrato.tsx:546-567`), cai sempre no `else` → `useCreateLease` (INSERT, `src/hooks/useLeases.ts:265-320`) em vez de `useUpdateLease` (`useLeases.ts:367+`)

O trigger **não** é culpado: `sync_pending_lease_from_unit` (verificado no banco) só insere quando a unit **não tem nenhum lease** (`SELECT EXISTS ... FROM leases WHERE unit_id = NEW.id`), portanto é idempotente e não gera um 2º pending.

Por que o usuário só vê o problema na listagem: `useLeaseByUnitId` (`useLeases.ts:219-239`) filtra `status in (active,pending)`, ordena por `created_at desc` e faz `limit(1)`, então a aba Contrato mostra só o mais novo; o pending órfão sobrevive silenciosamente e aparece em `/gestao/contratos`.

Dados atuais: apenas 2 units com mais de 1 lease; 1 delas com exatamente o padrão do bug (1 pending + 1 novo, 2 inquilinos distintos).

### Correção proposta (baixo risco)
1. Aceitar ambos os params em `NovoContrato.tsx:115`: `searchParams.get("edit") ?? searchParams.get("editLeaseId")`.
2. Padronizar o link em `UnitContractTab.tsx:166` para `?edit=` (mantendo a leitura dupla por compatibilidade com links antigos/salvos).
3. Limpeza dos pending órfãos existentes: migração pontual que encerra (`status='cancelled'`) leases `pending` de units que já possuem outro lease mais recente — apenas as 2 linhas identificadas. **Confirmar antes de executar.**

## PEDIDO 2 — Aba Inquilinos como histórico de contratos

### Schema
`leases` tem: `unit_id`, `tenant_contact_id`, `owner_contact_id`, `rent_amount`, `start_date`, `end_date`, `status`, `contract_status`, `termination_date`, entre outras. **Não existe `unit_subdivision_id` nem `property_id`** — o property é resolvido via `units.property_id`. Join com `contacts` disponível pela FK `leases_tenant_contact_id_fkey` (mesmo padrão já usado em `ContractsTab.tsx`).

`unit_subdivisions` tem `tenant_contact_id` próprio, **sem qualquer ligação com `leases`**. Hoje existem três lugares paralelos guardando "quem é o inquilino": `units.tenant_contact_id`, `unit_subdivisions.tenant_contact_id` e `leases.tenant_contact_id`.

Resposta ao item 8: sim — para imóvel fracionado, todos os leases ficam com o mesmo `unit_id` da unit pai e **não há como diferenciar a fração** hoje.

### O que ficaria órfão
- Leitura de `unit_tenant_history`: `src/components/units/TenantHistoryPanel.tsx:51-53` e `src/components/reports/ReportsAssetsSection.tsx:229-231` (este último **permanece**, não mexer)
- Escrita: RPC `register_tenant_history_entry` chamada só em `src/components/units/RegisterTenantHistoryDialog.tsx:142`
- `RegisterTenantHistoryDialog` só é importado por `TenantHistoryPanel.tsx:7,73`

Ou seja: removendo o botão da aba, o dialog e a RPC ficam sem call site na UI. A tabela e o trigger de auditoria continuam existindo (dados históricos preservados e ainda usados no relatório).

### `units.tenant_contact_id` — não tocar
Usado amplamente: `UnitFormFields.tsx:80,122,195,851`, `EditUnitDialog.tsx:90,143,312`, `UnitSelector.tsx`, `UnitMultiSelector.tsx:96`, `NovoContrato.tsx:192,292`, `ObligationsConfigForm.tsx:77-89`, `DimobStatusCard.tsx`, `ContactsUnified.tsx:247-269`, `CreateContactDialog.tsx:270,305`, `DimobReportTab.tsx:74,119`. O escopo fica restrito à aba Inquilinos.

### Padrão a reaproveitar
`src/components/assets/ContractsTab.tsx:290-330` (select com `tenant_contact:contacts!leases_tenant_contact_id_fkey(...)` + `unit:units!leases_unit_id_fkey(...)`) e o mapa `STATUS_LABELS` em `ContractsTab.tsx:101-107` — idêntico ao de `UnitContractTab.tsx:17-27`. Recomendo extrair esse mapa para um módulo compartilhado (`src/lib/lease-status.ts`) e consumi-lo nos três lugares.

### Nova aba Inquilinos (somente leitura)
Reescrever `TenantHistoryPanel.tsx` para listar **contratos** da unidade (ou de todas as units filhas, quando for property):
- Query: `leases` por `unit_id` (ou `unit_id in (units filhas)`), join com `contacts`, ordenada por `start_date desc`
- Colunas por linha: inquilino, período (`start_date` → `end_date`, ou "em vigor"), `rent_amount` em BRL, badge de status
- Múltiplos contratos ativos aparecem simultaneamente — resolve o caso do imóvel fracionado no nível de exibição
- Remover o botão "Registrar Entrada de Inquilino" e o uso de `RegisterTenantHistoryDialog`
- Estado vazio: orientar a criar contrato (link para `/gestao/contratos/novo?unitId=...`)
- Opcional: seção colapsada "Histórico legado" lendo `unit_tenant_history`, para não esconder dados antigos

## Recomendação de escopo

**Nesta rodada (seguro):**
- Fix do param `edit`/`editLeaseId` + padronização do link
- Aba Inquilinos convertida em leitura de contratos, com múltiplos ativos simultâneos
- Extração do `STATUS_LABELS` compartilhado
- (Sob confirmação) limpeza das 2 linhas pending órfãs

**Próximo passo (fora desta rodada):**
- Coluna `leases.unit_subdivision_id` + FK, para vincular formalmente contrato ↔ fração, exibir a fração na linha do histórico e permitir que o wizard escolha a fração
- Unificar as três fontes de "inquilino atual" (`units`, `unit_subdivisions`, `leases`) — mudança estrutural com impacto em DIMOB, relatórios e formulários
