# Auditoria — Conciliação Bancária (diagnóstico, sem alterações)

Arquivos lidos: `src/pages/FinanceReconciliation.tsx`, `ImportStatementDialog.tsx`, `ReconciliationPanel.tsx`, `ReconciliationMatcherDialog.tsx`, `ReconciliationMismatchDialog.tsx`, `ReconciliationPendingListGrouped.tsx`, `ReconciliationHistoryTable.tsx`, `StatementImportHistoryDialog.tsx`, `TransactionsTableInfinite.tsx` + schema/RLS/índices/triggers de `bank_statement_entries`, `bank_statement_imports`, `bank_accounts`, `balance_audits`.

Observação de nomenclatura: não existe tabela `bank_transactions`; o extrato vive em `bank_statement_entries`.

## 1. Veredito das 10 práticas

| # | Prática | Veredito | Evidência |
|---|---|---|---|
| 1 | Importação de extrato | Parcial | OFX e CSV (`ImportStatementDialog.tsx:110-140`); sem CNAB. Duplicata só compara **nome do arquivo importado hoje** (`:57-99`) e é apenas aviso, não bloqueio |
| 2 | Matching automático | Parcial | Só valor exato ±R$0,01, sem data e sem score no auto (`ReconciliationPanel.tsx:180-190`). No matcher manual há sugestão com valor + tipo + ±3 dias (`ReconciliationMatcherDialog.tsx:104-118`), mas binário, sem score |
| 3 | Sugestão vs. conciliação silenciosa | Parcial | O botão "Conciliação automática" grava direto no banco sem revisão prévia (`ReconciliationPanel.tsx:178-215`); o fluxo manual sim pede seleção humana |
| 4 | Conciliação parcial | Não existe | `bank_statement_entries.transaction_id` é 1 uuid; divergência de valor só gera aviso e concilia integral (`ReconciliationMismatchDialog.tsx`, `ReconciliationPanel.tsx:127-137`) |
| 5 | Muitos-para-um | Não existe | Modelo é 1 entrada ↔ 1 lançamento (FK única, sem tabela de vínculo) |
| 6 | Desfazer conciliação | Parcial | Existe com confirmação (`ReconciliationHistoryTable.tsx:86-120`), mas **não grava trilha** — só limpa `is_reconciled`/`transaction_id`/`reconciled_at` |
| 7 | Fechamento de período | Não existe | `balance_audits` marca datas como "Auditado" (badge visual), mas nada impede desconciliar ou editar essas datas |
| 8 | Relatório de diferenças | Parcial | Cards mostram importado/conciliado/pendente do lado extrato (`FinanceReconciliation.tsx:78-120`) e há aba Conferência (`BalanceAuditPanel`), mas não há total do que sobrou **do lado dos lançamentos** nem número único de diferença dos dois lados |
| 9 | Idempotência da importação | Não existe | Nenhum índice único em `bank_statement_entries` (só PK e índices comuns); nenhum hash de arquivo nem FITID do OFX é gravado — reimportar o mesmo OFX **duplica todas as linhas** |
| 10 | Trilha de auditoria | Não existe | Nenhum trigger em `bank_statement_entries` / `financial_transactions` (consulta a `information_schema.triggers` retornou vazio); nenhuma coluna `reconciled_by` |

## 2. Perguntas de confiabilidade

**Editar o valor do lançamento depois de conciliar?**
A conciliação continua válida e silenciosamente errada. Nada em `CreateTransactionDialog`/`TransactionsTableInfinite` reseta `is_reconciled` ao alterar `amount`, e não há constraint/trigger conferindo igualdade. Pior: excluir o lançamento dispara `ON DELETE SET NULL` em `bank_statement_entries.transaction_id`, mas `is_reconciled` **fica true** — a entrada some das pendências e vira um conciliado órfão sem contraparte.

**A conciliação escreve em `financial_transactions` sem confirmação explícita?**
Sim, em dois pontos. `ReconciliationPanel.handleAutoReconcile` (`:178-215`) grava `is_reconciled`/`reconciled_at` em lote com um clique, sem preview. E `ReconciliationMatcherDialog.handleReconcile` (`:137-160`) além de conciliar altera `status: "paid"`, `paid_date = hoje` e `bank_account_id` do lançamento — muda dado financeiro que o usuário não pediu para mudar, com data de pagamento "hoje" em vez da data do extrato.

**Respeita `broker_id`?**
Não há vazamento entre brokers, mas há um problema de workspace. `bank_statement_entries`, `bank_statement_imports` e `balance_audits` usam RLS `auth.uid() = broker_id`, enquanto `bank_accounts` usa `get_workspace_user_ids(auth.uid())`. Consequência: o importador grava `broker_id = effectiveBrokerId` (`ImportStatementDialog.tsx:286`), então um **membro da equipe** tem o insert recusado pela RLS e não enxerga o extrato do dono — a conta bancária aparece, o extrato não. Isolamento está seguro; multi-tenancy interno está quebrado.

## 3. O que realmente vale mudar (priorizado)

### (a) Risco de dado errado
1. Idempotência da importação: gravar `fitid` (OFX) + hash do arquivo e índice único `(bank_account_id, fitid)` / `(bank_account_id, entry_date, amount, description)`, pulando duplicadas no insert. **Médio**
2. Órfão pós-exclusão: ao desvincular (`transaction_id → null`), zerar `is_reconciled` — trigger no banco resolve os dois caminhos (delete e update). **Pequeno**
3. Invalidar conciliação quando o valor do lançamento muda: trigger que zera `is_reconciled` das duas pontas ao alterar `amount`. **Pequeno**
4. RLS de workspace em `bank_statement_entries`/`imports`/`balance_audits`, alinhando com `bank_accounts`. **Pequeno** (migração), impacto alto
5. Parar de sobrescrever `status`/`paid_date`/`bank_account_id` no `ReconciliationMatcherDialog`; se mantiver, usar `paid_date = entry_date` do extrato e avisar. **Pequeno**

### (b) Ganho de confiabilidade
6. Auto-conciliação virar **preview**: listar os pares propostos com score (valor + proximidade de data + similaridade de descrição) e só gravar após confirmação. **Médio**
7. Trilha: colunas `reconciled_by` / `unreconciled_by`+`unreconciled_at`, ou trigger de audit_log nas duas tabelas. **Pequeno a médio**
8. Relatório de diferenças completo: pendentes dos dois lados com totais e delta único. **Pequeno**
9. Duplicata de arquivo: comparar hash em vez de nome, e em qualquer data, não só "hoje". **Pequeno** (cai junto com o item 1)

### (c) Só conforto de UX
10. Filtro de data também na lista de lançamentos pendentes (hoje só o extrato é filtrado — `ReconciliationPanel.tsx:57-71`). **Pequeno**
11. Suporte a CNAB / arrastar-e-soltar arquivo. **Grande**, baixo retorno agora

## 4. O que NÃO vale mexer

- **Conciliação parcial e N:1** — exigem tabela de vínculo nova, reescrita das telas e migração dos dados já conciliados. Para gestão imobiliária o caso 1:1 cobre quase tudo; risco de quebrar muito maior que o ganho.
- **Fechamento de período com trava** — `balance_audits` já dá o sinal visual de "Auditado". Uma trava dura tende a travar o usuário em correção legítima. Deixar como está.
- **Parser OFX/CSV atual** — a detecção de delimitador, datas em múltiplos formatos e extração de LEDGERBAL/AVAILBAL estão corretas e cobrem os bancos brasileiros comuns. Só acrescentar FITID, sem reescrever.
- **Layout, abas e agrupamento por data** (`ReconciliationPendingListGrouped`, cards de resumo) — está bom, responsivo e legível. Redesenho aqui é custo sem retorno.
- **`ReconciliationMismatchDialog`** — o aviso de divergência já existe e funciona; o problema não é o diálogo, é o que acontece depois.

Recomendação de execução, se aprovado: fazer só o bloco (a) numa leva (uma migração + ajustes pontuais em 2 arquivos), medir, e só então decidir sobre o bloco (b).
