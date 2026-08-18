# Fase A.6 — Unificar aba Atividades (Gestão de Ativo) com o padrão /gestao/manutencoes

## 1. Como `Manutencoes.tsx` está hoje (680 linhas, leitura real)

- É uma **página inteira**: `AppLayout title="Manutenções"` + header com título/descrição + botão "Nova atividade" + Card de Filtros + Card com a tabela + dialogs.
- **Query única** (`['activities-list', brokerId, from, to]`): lê só `property_activities` filtrando `broker_id = effectiveBrokerId` e `created_at` entre o range; `limit(500)`; depois hidrata labels de `units`, `properties` e `contacts` em 3 queries `in()`.
- **Filtros**: período (Popover + Calendar range, default = mês corrente até hoje), tipo (`ACTIVITY_TYPES`), contato responsável, ativo (`unit:<id>` / `property:<id>`), busca textual. Período é server-side; os outros 4 são client-side em `filtered`.
- **Agrupamento**: `groupedRows` junta linhas por `activity_group_id` (grupo com 1 item vira single), ordenado por `scheduled_at || created_at` desc, com linhas expansíveis.
- **Ações por linha**: `RowActions` (dropdown) → Editar (abre `ActivityFormDialog` com `EditingActivity` + `AssetOption`), Marcar concluída/pendente (`setCompleted`, update direto), Excluir (AlertDialog + delete). Invalida `activities-list` e `asset-manual-notes`.
- **Export**: **não tem nenhum**.
- **Extração**: a separação já é limpa — todo o miolo (estado de filtros, query, `groupedRows`, `setCompleted`, `handleDelete`, `openEdit`, tabela, `ActivityFormDialog`, `AlertDialog`) não depende de `AppLayout`. Dá pra extrair um componente de corpo sem refatoração estrutural; só o `AppLayout` + `<h1>`/descrição ficam na página.

## 2. Escopo por ativo — mudança mínima

Hoje a query não tem noção de ativo (é broker inteiro). Mudança mínima:

- Adicionar props opcionais `scopeUnitId` / `scopePropertyId`.
- Incluí-las na `queryKey` e, quando presentes, adicionar `.eq('unit_id', scopeUnitId)` (ou `.eq('property_id', scopePropertyId)`) à query.
- Quando há escopo: esconder o filtro "Ativo" e a coluna "Ativo" da tabela (redundantes), e fixar `defaultAsset` + `lockAsset` no `ActivityFormDialog`.
- Sem escopo: comportamento **byte-a-byte igual ao de hoje**.

O filtro `broker_id` continua sempre aplicado — o escopo é aditivo, não substituto (mantém o isolamento multi-tenant).

## 3. O que a aba do `AlugueiDetalhe.tsx` perde — números reais

Contagem no banco hoje (units com lease `active` = 17):

| fonte | linhas ligadas a units com gestão ativa | total na base |
|---|---|---|
| `schedule_activities` | **0** | 2 |
| `deal_activities` | **9** (concentradas em 2 units) | 9 |
| `property_activities` | 4 | 11 |

Leitura: `schedule_activities` é irrelevante nessa tela (zero linhas). `deal_activities` existe, mas é histórico de CRM **pré-locação** (a negociação que originou o contrato) concentrado em 2 unidades — é contexto, não operação de gestão. Além disso a aba atual **não tem** anexos, editar/excluir, toggle de concluído, filtros de tipo/contato/busca nem agrupamento — ou seja, o que se ganha é maior do que o que se perde.

Também se perde o export CSV/PDF caseiro (ver item 5) e o formulário inline de nova atividade (substituído pelo `ActivityFormDialog`, que é superior).

## 4. Recomendação

Sua abordagem é sã. Recomendo com um ajuste:

- Extrair **`src/components/assets/AssetActivitiesPanel.tsx`** com todo o miolo de `Manutencoes.tsx`, props: `scopeUnitId?`, `scopePropertyId?`, `showHeader?`, `assetLabel?`.
- `Manutencoes.tsx` vira uma casca fina: `AppLayout` + header + `<AssetActivitiesPanel />` sem escopo.
- Aba Atividades de `AlugueiDetalhe.tsx`: `<AssetActivitiesPanel scopeUnitId={unitId} />`, removendo ~270 linhas inline (queries, merge, filtros de data, form inline, exports).
- **Plano B (deal_activities)**: em vez de uma seção separada permanente, recomendo um **bloco colapsável somente-leitura "Histórico comercial (CRM)"** renderizado **apenas quando `scopeUnitId` existe e há linhas** — some sozinho nas 15 de 17 unidades sem dados, e preserva a informação onde ela existe. `schedule_activities` pode ser **descartado** (0 linhas, e a agenda já tem tela própria) — ou incluído no mesmo bloco colapsável a custo quase zero, já que a query é trivial. Sugiro incluir para não perder nada.

Melhor caminho do que criar mais um componente: nada de novo timeline. `AssetActivityTimeline.tsx` (audit_logs + anexos) continua onde está — ele resolve outro problema (trilha de auditoria), e não é substituído por esta fase.

## 5. Relatório completo do imóvel (CSV/PDF caseiro → `RAReportConfigDialog`)

Sim, dá pra trocar sem perda funcional relevante:

- `RAReportConfigDialog` já aceita `preSelectedAssetIds` + `preSelectedAssetType` + `dateRange` + `formatLabel`, exatamente como `AssetActivityTimeline` usa hoje (linhas 925+).
- Existem geradores para **PDF, Excel, CSV e DOCX** (`assetReportPdfGenerator/ExcelGenerator/CsvGenerator/DocxGenerator`), então o CSV atual está coberto — na verdade com mais formatos e com seções configuráveis (`AssetReportSections`).
- Única diferença de conteúdo: o PDF caseiro lista as linhas de `deal_activities`/`schedule_activities` na tabela; o relatório RA é orientado a `property_activities` + dados do ativo. Dado o volume (item 3), é uma perda aceitável — e o bloco colapsável do item 4 mantém a informação visível na tela.

Decisão proposta: substituir o dropdown "Exportar (CSV/PDF)" por um botão único **"Relatório do imóvel"** abrindo `RAReportConfigDialog` com `preSelectedAssetIds=[unitId]`, `preSelectedAssetType='unit'`, `dateRange` do filtro de período do painel.

## Detalhes técnicos da execução (quando aprovado)

1. Criar `src/components/assets/AssetActivitiesPanel.tsx` — move o corpo de `Manutencoes.tsx` (estado, query, `groupedRows`, `setCompleted`, `handleDelete`, `openEdit`, tabela, `ActivityFormDialog`, `AlertDialog`); adiciona props de escopo e o botão de relatório.
2. Reescrever `src/pages/gestao/Manutencoes.tsx` como casca (`AppLayout` + header + painel sem escopo).
3. Em `src/pages/gestao/AlugueiDetalhe.tsx`: remover as queries `schedule-activities-unit` / `deal-activities-unit` / `property-activities`, `allActivities`, `filteredActivities`, `exportActivitiesCSV`, `exportActivitiesPDF`, `handleSaveActivity`, o form inline e os estados associados; renderizar o painel escopado + o bloco colapsável de CRM/agenda.
4. Manter `queryKey` `['activities-list', ...]` e as invalidações de `asset-manual-notes` para não quebrar sincronização com outras telas.
5. Respeitar `canCreate`/permissões já usadas na aba atual ao renderizar as ações.
6. Build + verificação visual das duas telas.
