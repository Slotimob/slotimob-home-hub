# Diagnóstico — Unificação da aba Atividades (imóvel/unidade) + redesenho do Relatório Completo

Leitura real do código feita antes deste documento. Nada foi alterado.

## 1. `AssetActivityTimeline.tsx` (1026 linhas) — o que é hoje

**Onde é usado (6 lugares, componente único, sem cópias):**
- `src/pages/PropertyDetalhe.tsx:528` (`/properties`)
- `src/pages/UnitDetalhe.tsx:588` (`/units` e `/real-estate`, mesma página)
- `src/components/EditPropertyDialog.tsx:330`
- `src/components/units/EditUnitDialog.tsx:521`
- `src/components/UnitDetailsDialog.tsx:376`

Props: `assetType` ('property' | 'unit'), `assetId`, `brokerId`, `pageSize`.

**Fontes de dados (2 queries):**
- `audit_logs`: duas buscas paralelas (por `table_name`+`record_id`, e por `metadata->>property_id|unit_id`), merge + `deduplicateAuditLogs`, limite 500 cada.
- `property_activities` do ativo (com nome do contato responsável e contagem de anexos vinda de `documents.activity_id`).

**Filtros atuais:** Tipo (`EVENT_GROUPS`), Período (select 7/30/90/todo — default 30), Usuário (aparece só se houver mais de um). Paginação incremental de 25.

**Funcionalidades que o painel de manutenções NÃO tem:**
- Agrupamento por dia ("Hoje", "Ontem", data por extenso).
- Colapso de cobranças: >5 eventos `billing_issued` no mesmo mês viram um item resumo expansível.
- Renderização humanizada de log de auditoria (`humanizeLog`, `getChangedFields`: campo, de → para).
- Edição inline de nota manual (título + data) e exclusão com AlertDialog.
- Exportação CSV e PDF próprios.
- Botões "Incluir atividade" (`ActivityFormDialog`) e "Relatório completo" (`RAReportConfigDialog`).

**`AssetActivitiesPanel.tsx` (762 linhas)** lê **somente** `property_activities`. É tabela com agrupamento por `activity_group_id`, filtros de tipo/status/imóvel/período (date range com default mês atual), ações de editar/excluir/concluir/reabrir, custo estimado, vínculo com transação, escopo por `scopeUnitId`/`scopePropertyId` e criação controlada pelo pai.

**Conclusão da pergunta "é seguro trocar por `AssetActivitiesPanel` escopado?": Não.**
Ao contrário de `AlugueiDetalhe.tsx` (onde só interessavam manutenções), aqui o valor principal é o log de auditoria — que o painel não consulta. Trocar direto perderia auditoria, agrupamento por dia, colapso de cobranças e exportações. O caminho certo é evoluir a timeline para o padrão do painel (date range, botões, ações), reaproveitando `ActivityFormDialog` e o mesmo componente de filtro de período, em vez de substituir o componente.

## 2. Benfeitorias e reajuste de aluguel — de onde vêm

- **Benfeitorias**: tabela `asset_improvements` (`property_id`/`unit_id`, `cost`, `completed_at`, `affects_market_value`). No relatório vêm de `asset-report-data.ts:172-197`. Na timeline **não há query direta** — aparecem apenas se houver linha em `audit_logs` com `table_name = 'asset_improvements'`, para a qual já existe o grupo de filtro "Benfeitorias" (`audit-formatting.ts:254`). Se o gatilho de auditoria dessa tabela não estiver ativo, hoje elas simplesmente não aparecem na aba — isso precisa ser confirmado por query antes de implementar.
- **Reajuste de aluguel**: gravado em `lease_adjustments` + `leases.rent_amount`; na timeline chega via `audit_logs` com ação `lease_rent_adjusted`/tabela `leases`, cobertos pelo grupo "Contratos" (`audit-formatting.ts:225-228`). Ou seja, já aparecem — desde que o log carregue `metadata.unit_id`/`property_id`; caso contrário o evento fica invisível no escopo do imóvel. Também a confirmar por query.
- **Documentos com nome do arquivo**: grupo "Documentos" existe, mas o texto exibido depende de `getRecordName`/`humanizeLog`; hoje não há garantia de mostrar o nome do arquivo.

## 3. Relatório Completo — estrutura atual do PDF

`RAReportConfigDialog.tsx` só escolhe escopo (todos/específicos) e liga/desliga 6 seções (`acquisition`, `market`, `expenses`, `income`, `activities`, `improvements`); os dados vêm de `buildAssetReport` (`src/lib/asset-report-data.ts`) e o desenho de `src/utils/assetReportPdfGenerator.ts`.

Ordem atual no PDF:
1. Capa (título, período, nº de imóveis, data de geração) — linhas 49-65
2. Página "Sumário Consolidado" (9 KPIs globais) — 67-97
3. Por imóvel: **Aquisição** (118-139), **Valor de Mercado** (141-162), **Benfeitorias no Período** (164-184), **Despesas no Período** + Top 10 (186-238), **Receitas no Período** (240-251), **Atividades no Período** (253-288), **Manutenções e Atividades** (290-328), **Indicadores** (330-353)
4. Rodapé com paginação (363-370)

**Os 3 blocos que devem virar 1 "Sumário Financeiro Consolidado":** página de Sumário Consolidado (71-97, KPIs globais), Aquisição + Valor de Mercado (118-162) e Indicadores (330-353) — este último repete ROI/Yield/Cap Rate do sumário e contagens já mostradas nas próprias tabelas.

**Texto mal escrito citado:** `assetReportPdfGenerator.ts:319-326` — `Total: N atividade(s) · N pendente(s) · Custo estimado R$ X`, com abreviações "(s)", separador "·" e sem ponto final. Fica logo abaixo da tabela de Manutenções. Também há inconsistência nos cabeçalhos dessa tabela ("Custo est.", "Lanç.").

Existem geradores irmãos que precisam acompanhar a mudança de estrutura: `assetReportCsvGenerator.ts`, `assetReportExcelGenerator.ts`, `assetReportDocxGenerator.ts`.

## 4. O botão "Exportar PDF" avulso da timeline

`AssetActivityTimeline.tsx:511-535`: jsPDF em paisagem, sem capa, com uma única tabela `Data | Ação | Tipo | Registro | Usuário | Alterações` a partir de `buildExportRows()` (linhas 467-490).

**A inteligência exclusiva dele** é a coluna **"Alterações"** (`getChangedFields` → `campo: de -> para`) e a coluna **"Usuário"** (nome resolvido via `profile_directory`). O relatório completo, na seção "Atividades no Período", só traz `Data | Tipo | Descrição` (`humanizeLog`), **sem usuário e sem o diff campo a campo**. É exatamente isso que a nova seção final "Atividades no Período" do relatório precisa absorver — o que exige enriquecer `asset-report-data.ts` (`AssetReportActivity` ganha `user` e `changes`).

## 5. Compartilhamento entre as 3 telas

O componente é literalmente o mesmo nas três telas (e em mais 3 diálogos). **Padronizar é barato**: mexer em `AssetActivityTimeline.tsx` propaga para todos. O custo real está no PDF/relatório, não na aba.

## Fracionamento sugerido

**Fase 0 — verificação de dados (rápida, só queries)**
Confirmar em produção: existem logs de `asset_improvements` em `audit_logs`? Os logs de `lease_rent_adjusted` carregam `metadata.unit_id`/`property_id`? Os logs de `documents` guardam o nome do arquivo? O resultado decide se a Fase 1 é só de UI ou se precisa de query direta a `asset_improvements`/`lease_adjustments` (e possivelmente trigger de auditoria).

**Fase 1 — aba Atividades (UI)**
Date range picker (default mês atual) no lugar do select de atalhos; barra de ações com "Incluir Atividade", "Relatório completo" e "Exportar CSV"; remoção do "Exportar PDF" avulso. Sem mudança de fonte de dados.

**Fase 2 — cobertura de dados do "raio-x"**
Fechar as lacunas apontadas pela Fase 0 (benfeitorias, reajustes, nome do arquivo em documentos), adicionando as fontes que faltarem à timeline.

**Fase 3 — dados do relatório**
Enriquecer `asset-report-data.ts`: usuário + diff nas atividades, e consolidação dos números hoje espalhados entre sumário/aquisição/mercado/indicadores.

**Fase 4 — redesenho do PDF**
Nova ordem (Capa → Sumário Financeiro Consolidado → Benfeitorias → Manutenções e Atividades → Atividades no Período), texto corrigido abaixo da tabela de manutenções e revisão de cabeçalhos. QA visual obrigatório com `pdftoppm`.

**Fase 5 — paridade dos outros formatos**
CSV/Excel/DOCX seguindo a nova estrutura.

Sugiro tratar Fase 0+1 juntas e Fase 3+4 juntas; Fase 5 pode ficar por último ou ser dispensada se os outros formatos forem pouco usados.
