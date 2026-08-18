# Fases 3.3 + 3.4 — Redesenho do "Relatório Completo" (só desenho)

## Resposta à ambiguidade: 1 imóvel vs vários

Recomendação: **estrutura única, com a página de agregado condicional.**

- `report.assets.length === 1` → **sem** página de abertura agregada. A capa já leva o nome do imóvel, e o "Sumário Financeiro Consolidado" do próprio imóvel entra como seção 2 dentro da página do imóvel. Zero redundância.
- `report.assets.length > 1` → **página de abertura "Sumário da Carteira"** com os KPIs agregados (o que hoje é a página "Sumário Consolidado"), e cada imóvel repete a mesma seção 2, mas escopada a ele. O agregado deixa de se chamar "Consolidado" para não colidir com a seção por imóvel.

Regra de nomenclatura para não confundir:
- Agregado (só quando N > 1): **"Sumário da Carteira"**
- Por imóvel (sempre): **"Sumário Financeiro Consolidado"**

## Estrutura final proposta

```text
[Capa]  Relatório Completo do Imóvel
        Nome do imóvel (quando N = 1)  |  "N imóveis" (quando N > 1)
        Período: dd/mm/aaaa — dd/mm/aaaa   (ou "todo o histórico até ...")
        Gerado em ...

[Página agregada — SOMENTE se N > 1]  Sumário da Carteira

[Por imóvel, 1 página inicial cada]
  Cabeçalho: nome, endereço, tipo
  1. Sumário Financeiro Consolidado
  2. Benfeitorias no Período
  3. Manutenções e Atividades
  4. Atividades no Período  (log completo, por último)
```

Observação: Despesas no Período (categorias + top 10) e Receitas no Período **não somem** — passam a ser blocos internos da seção 1 (ver abaixo), o que elimina o "Receitas: total" solto de uma linha só.

## Seção "Sumário Financeiro Consolidado" (por imóvel) — campos exatos

Consolida hoje 3 blocos espalhados: Aquisição, Valor de Mercado e Indicadores (fim da página), mais Receitas/Despesas. Layout em 4 sub-blocos numa mesma seção:

**a) Patrimônio (Aquisição × Mercado)** — tabela de 2 colunas
| Campo | Origem |
|---|---|
| Valor de aquisição | `acquisition.value` |
| Data de aquisição | `acquisition.date` |
| Custos de aquisição (ITBI, cartório) | `acquisition.costs` |
| Benfeitorias capitalizadas | `acquisition.total_invested − value − costs` (derivado, hoje só implícito) |
| **Total investido** | `acquisition.total_invested` |
| Valor de mercado atual | `market.current_value` |
| Última atualização do valor | `market.last_updated` |
| Valorização (R$) | `market.appreciation_abs` |
| Valorização (%) | `market.appreciation_pct` |
| Observações de aquisição | `acquisition.notes` (só se houver) |

**b) Resultado no período**
| Campo | Origem |
|---|---|
| Receitas no período | `period.income_total` |
| Despesas no período | `period.expenses_total` |
| Resultado líquido | `income_total − expenses_total` (derivado; hoje só existe no agregado) |

**c) Indicadores** (o bloco que hoje fica no fim, sem repetição)
| Campo | Origem |
|---|---|
| ROI no período | `period.roi_pct` |
| Yield mensal | `period.monthly_yield` |
| Cap Rate | `period.cap_rate` |

Contadores que hoje estão misturados em "Indicadores" (`activities_count`, `maintenance_count`, `maintenance_estimated_cost`) **saem daqui** e viram o rodapé de totais das seções 3 e 4, onde fazem sentido.

**d) Composição das despesas** (só se `expenses_total > 0`)
- Tabela por categoria: Categoria / Valor / % do total + linha de Total (igual hoje).
- Tabela "Maiores despesas do período" (top 10): Descrição / Categoria / Valor / Data.

Nenhum número de hoje é perdido: capa, KPIs agregados, aquisição, mercado, receitas, despesas, indicadores e contadores estão todos mapeados acima ou nas seções 3/4.

**Página "Sumário da Carteira" (N > 1)** mantém exatamente os 9 KPIs atuais de `report.summary`: total investido, valor de mercado total, valorização (R$ e %), receitas, despesas, resultado líquido, ROI, yield mensal médio, cap rate médio — mais uma tabela-índice de uma linha por imóvel (Imóvel / Total investido / Valor de mercado / Receitas / Despesas / Resultado), que hoje não existe e evita ter que folhear o PDF.

## Seção "Manutenções e Atividades" — cabeçalhos e texto

Cabeçalhos atuais abreviados demais (`Custo est.`, `Lanç.`, `Anexos`) passam a:

`Data · Tipo · Atividade · Responsável · Custo estimado · Lançamento financeiro · Anexos · Status`

com `Lançamento financeiro` exibindo "Sim/Não" e coluna estreita, e quebra de linha permitida no cabeçalho.

Texto abaixo da tabela — hoje:
> `Total: 3 atividade(s) · 1 pendente(s) · Custo estimado R$ 1.200,00`

Proposto (2 linhas, sem parênteses de plural e com pluralização correta):
> **Resumo do período:** 3 manutenções registradas, sendo 1 ainda pendente e 2 concluídas.
> **Custo estimado total:** R$ 1.200,00 (valores previstos; não representam necessariamente lançamentos financeiros efetivados).

Quando houver mais itens que o limite exibido, acrescenta-se:
> Exibindo as 120 manutenções mais recentes de 148 no período.

## Seção "Atividades no Período" (última) — log completo com usuário e diff

Passa de tabela de 3 colunas (Data / Tipo / Descrição truncada em 90 chars) para o formato do antigo "Exportar PDF" da timeline:

`Data e hora · Usuário · Evento · Alterações`

- **Data e hora**: `dd/mm/aaaa HH:mm` (hoje só a data).
- **Usuário**: nome do autor da ação.
- **Evento**: grupo + descrição humanizada (`humanizeLog`), sem truncar em 90 caracteres — `overflow: linebreak`.
- **Alterações**: diff campo a campo (`Campo: de → para`), uma linha por campo, reusando `getChangedFields` / `diffOldNew`. Campos ignorados continuam filtrados por `shouldIgnoreField`.
- Rodapé com "Exibindo as N atividades mais recentes de M no período" (limite `ACTIVITIES_REPORT_LIMIT`).
- Notas manuais entram na mesma tabela com Usuário e sem diff, como hoje.

## O que falta em `asset-report-data.ts` (resposta direta)

**Não tem hoje.** `AssetReportActivity` guarda apenas `{ date, group, description }` — a descrição já é a string humanizada e o log original é descartado. Faltam duas coisas:

1. **Usuário**: os logs vêm com `actor_user_id` e `broker_id`, mas o builder nunca busca perfis. Precisa de um passo extra — coletar os ids dos logs e buscar em `profile_directory` (`id, full_name`), exatamente como `AssetActivityTimeline` já faz. Detalhe a confirmar na implementação: a timeline hoje resolve o nome por `broker_id`, o que mostra o dono da conta e não o autor real; no relatório o correto é priorizar `actor_user_id` e cair para `broker_id` como fallback.
2. **Diff**: precisa carregar `old_data`/`new_data`/`action`/`table_name` no item de atividade (campos que a query já traz, só não são propagados) e calcular o diff. Recomendação: guardar `changes: { label, from, to }[]` já calculado no data layer, mantendo o gerador de PDF burro.

Nenhuma query nova ao banco além da busca de perfis; nada de tabela, trigger ou backfill.

## Arquivos afetados na implementação (fase seguinte)

- `src/lib/asset-report-data.ts` — enriquecer `AssetReportActivity` (`user_name`, `changes`, `action`, `table_label`), buscar perfis, expor `period_net` por imóvel.
- `src/utils/assetReportPdfGenerator.ts` — nova ordem de seções, página agregada condicional, novos cabeçalhos e textos.
- `src/components/reports/RAReportConfigDialog.tsx` — sem mudança estrutural; no máximo o rótulo do checkbox "Atividades e movimentações" para refletir o log detalhado.
