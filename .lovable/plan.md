# Fracionamento de imóvel avulso + contratos — diagnóstico e plano

## Diagnóstico

### Pedido 1 — vínculo formal contrato ↔ fração

**Schema (confirmado via information_schema):**

- `public.leases` (35 colunas): `id uuid`, `broker_id uuid NOT NULL`, `unit_id uuid NOT NULL`, `tenant_contact_id uuid NOT NULL`, `owner_contact_id uuid`, `rent_amount numeric NOT NULL`, `admin_fee_percentage numeric`, `due_day int`, `deposit_amount numeric`, `start_date date NOT NULL`, `end_date date`, `status text NOT NULL default 'active'`, `cib text`, `is_dimob_deductible bool`, `billing_automation jsonb`, `billing_logs jsonb`, `notes text`, `metadata jsonb`, `created_at/updated_at timestamptz`, `adjustment_index text`, `next_adjustment_date date`, `contract_status text`, `signature_status text`, `signed_contract_path text`, `termination_date date`, `termination_reason text`, `guarantee_type text`, `guarantor_data jsonb`, `payment_info jsonb`, `administration_fee_value numeric`, `gross_rent_value numeric`, `is_dimob_eligible bool`, `needs_tenant_review bool NOT NULL`, `tenant_review_note text`.
  **Não existe `unit_subdivision_id` nem `property_id`.**
- `public.unit_subdivisions`: `id uuid`, `unit_id uuid NOT NULL`, `broker_id uuid NOT NULL`, `label text NOT NULL`, `area numeric`, `rent_price numeric`, `tenant_contact_id uuid`, `status unit_status NOT NULL default 'available'`, `notes text`, `created_at/updated_at timestamptz`.

FK a criar: `leases.unit_subdivision_id uuid NULL REFERENCES public.unit_subdivisions(id) ON DELETE SET NULL` (nullable — a esmagadora maioria dos contratos é do imóvel inteiro).

**Wizard `src/pages/gestao/NovoContrato.tsx`** (1669 linhas): steps definidos em `STEPS` (linha 46): `unit` → `tenant` → `financial` → `guarantee` → `payment` → `billing` → `compliance`. Sim, existe step "Financeiro" (render em `NovoContrato.tsx:820`, começa com "Valor do Aluguel" + "Dia de Vencimento"). Step `unit` renderiza em `:674` (lista de imóveis com gestão ativa). Unidade efetiva resolvida em `:180` (`effectiveUnitId = editLease?.unit_id || unitIdParam || selectedUnitId`).
Melhor lugar para o select "Fração": **topo do step `financial`** (`:821`), acima de "Valor do Aluguel", condicionado a `has_subdivisions === true` da unit efetiva — assim a escolha da fração pode auto-preencher `rent_amount` com o `rent_price` da fração. (No step `unit` não caberia bem, porque quando se chega via `?unitId=` o wizard já pula direto para `tenant` — `:120`.)

**PDF do contrato:** `src/utils/legalContractPdfGenerator.ts`, função `generateLegalContractPDF` (`:234`). A Cláusula Primeira é montada em `:592-596`: `addClauseHeader('PRIMEIRA','DO OBJETO')` e `addSubClause('1.1', ...)` com `enderecoCompleto` + matrícula + CIB. Ponto exato para inserir a fração: dentro do texto de 1.1 (ou uma sub-cláusula 1.2 nova) quando o lease tiver fração.
Existe um segundo caminho, em markdown: `src/utils/legalTemplates.ts:444-446` (1.1 objeto, 1.2 descrição registral, 1.3 características físicas com `areaTotal`/`areaUtil`) — mesma informação precisa ser espelhada lá para não divergir.

**Onde mais a fração aparece no fluxo:** `src/components/assets/ContractGeneratorDialog.tsx:173` monta o objeto `imovel` (endereco/bairro/cidade/estado/cep/matricula/cib) — é aqui que os campos da fração precisam entrar (novos campos opcionais `fracaoLabel`/`fracaoArea` no tipo `LegalContractData.imovel`, `legalContractPdfGenerator.ts:187`). O dialog é usado por `ContratoDetalhe.tsx`, `AlugueiDetalhe.tsx`, `ContractsTab.tsx`, `AssetDetailDialog.tsx`, `LeaseManagementSheet.tsx` — todos herdam a mudança sem edição.

### Pedido 2 — UX do popup "Nova Fração" + coluna Contrato

- O popup é **inline** em `src/components/units/UnitSubdivisionsPanel.tsx` (não tem arquivo próprio): `Dialog` em `:237-329`. Campos: `label` (`:246`), `area` (Input number, `:258`), `rent_price` (`CurrencyInput`, `:268`), inquilino, status, notas. **Nenhuma validação cruzada** com área/aluguel do imóvel pai.
- Campos do imóvel avulso: `src/components/units/UnitFormFields.tsx` — `area_total` (`:496`, "Área Total (m²)"), `area` (`:507`, "Área Útil (m²)"), `rent_price` (`:666`, "Preço de Locação (R$/mês)"). São colunas de `units`. Portanto "quanto resta" = `unit.area_total (ou area) − Σ subdivisions.area` e `unit.rent_price − Σ subdivisions.rent_price`.
- Tabela de frações: `UnitSubdivisionsPanel.tsx:182-233`, colunas atuais **Label | Área (m²) | Aluguel | Inquilino | Status | Ações**. A coluna "Contrato" entra entre Status e Ações.

### Pedido 3 — múltiplos leases + "Gerar Novo Contrato"

- `src/components/units/UnitContractTab.tsx` (211 linhas) usa `useLeaseByUnitId` (`src/hooks/useLeases.ts:219-244`): filtra `unit_id`, `status in ('active','pending')`, ordena por `created_at desc`, **`.limit(1).maybeSingle()`** → só o mais recente.
- Decisão de render: `!lease` → estado vazio com "Criar Contrato" + "Vincular a Contrato Existente" (`:54-83`); `lease.status === 'pending'` → card âmbar "Contrato Pré-iniciado" com "Finalizar Configuração do Contrato" (`:107-161`); senão → card "Contrato Ativo" (`:162-208`).
- Rota `/gestao/contratos/novo?unitId=<id>`: **funciona hoje**. `unitIdParam` é lido em `:112`, faz o wizard iniciar direto no step `tenant` (`:120`) e alimenta `effectiveUnitId` (`:180`) + query `unit-name` (`:183`). Ou seja, abrir só com `?unitId=` já deixa o usuário selecionando inquilino e seguindo — nada falta. (O wizard também aceita `?edit=`/`?editLeaseId=` e `?step=`.)

## Plano de execução (fases, na ordem de dependência)

**Fase 1 — Migração (base de tudo)**
`ALTER TABLE public.leases ADD COLUMN unit_subdivision_id uuid NULL REFERENCES public.unit_subdivisions(id) ON DELETE SET NULL;` + índice. Sem mudança de RLS (isolamento continua por `broker_id`).

**Fase 2 — Wizard: campo "Fração"**
Select no topo do step `financial` de `NovoContrato.tsx`, visível só quando a unit efetiva tem `has_subdivisions=true`; opções via `useUnitSubdivisions(effectiveUnitId)`; ao escolher, auto-preenche `rent_amount` com o `rent_price` da fração (editável). Persistir `unit_subdivision_id` no create e no update (`useLeases.ts`).

**Fase 3 — Fração no contrato gerado**
Campos opcionais `fracao` (label + área) em `LegalContractData.imovel`; preencher em `ContractGeneratorDialog.tsx:173`; renderizar na Cláusula Primeira (`legalContractPdfGenerator.ts:594`) e espelhar em `legalTemplates.ts:444`.

**Fase 4 — UX do popup "Nova Fração"** (independente das fases 1-3, pode ir em paralelo)
Mostrar no dialog os saldos "Área restante" e "Aluguel restante" (total do imóvel − soma das frações já cadastradas, excluindo a que está em edição), com aviso não-bloqueante quando o valor digitado ultrapassar o saldo.

**Fase 5 — Coluna "Contrato" na tabela de frações** (depende das fases 1-2)
Nova coluna com badge de status do lease vinculado à fração (`LEASE_STATUS_LABELS` de `src/lib/lease-status.ts`), ou "Sem contrato" com atalho para `/gestao/contratos/novo?unitId=...`.

**Fase 6 — Aba Contrato com múltiplos leases** (depende da fase 1 para exibir a fração de cada linha; a listagem em si já pode ser feita antes)
Novo hook `useLeasesByUnitId` (sem `limit(1)`) e reescrita de `UnitContractTab.tsx` para listar todos os contratos ativos/pendentes (cada um com inquilino, fração, valor, status, ação), mantendo o card âmbar por contrato pendente, mais um botão fixo "Gerar Novo Contrato" → `/gestao/contratos/novo?unitId=<id>`.

## Observações
- `units.tenant_contact_id` e `unit_subdivisions.tenant_contact_id` continuam intocados — o vínculo por fração passa a ser a fonte formal via lease, sem quebrar o que já lê esses campos.
- Nada aqui altera o trigger `sync_pending_lease_from_unit`; o lease pendente que ele cria fica sem fração (`NULL`), comportamento correto para imóvel inteiro.
