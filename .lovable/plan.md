# Auditoria (modo leitura) — Obrigações, Reajuste e Idempotência

Nenhum arquivo foi alterado. Abaixo, o que o código realmente faz hoje.

---

## Bloco 1 — Os campos da configuração de obrigações bastam?

Existem **duas superfícies diferentes** que não têm os mesmos campos:

- **Imóvel** (`units.obligations_config`, editado em `ObligationsConfigForm.tsx`) — tipo `ObligationConfig`: `active`, `due_day`, `responsible`, `agency_contact_id`, `responsible_contact_id`, `control_type`, `amount` (herdado). **Na UI só aparecem: switch, tipo de controle, responsável e dia de vencimento.** Não há campo de valor na tela.
- **Contrato** (`leases`, editado em `LeaseFinancialStep.tsx`) — três formatos distintos:
  - `fire_insurance`: `total_amount`, `installments`, `installment_amount`, `first_due_date`, `charge_to`
  - `iptu_charge`: `annual_amount`, `installments`, `installment_amount`, `first_due_date`, `charge_to`, `source`
  - `additional_obligations[]` (condomínio, energia, água, gás, outros): `type`, `enabled`, `installment_amount` (mensal), `first_due_date`, `charge_to`, `label`

### Matriz por tipo de obrigação

| campo | IPTU | Seguro incêndio | Condomínio / Energia / Água / Gás |
|---|---|---|---|
| valor total | sim (`annual_amount`) | sim (`total_amount`) | **não** (só valor mensal) |
| número de parcelas | sim (`installments`) | sim (`installments`) | **não** |
| dia de vencimento | indireto: derivado de `first_due_date` (ou `due_day` do contrato) | idem | idem |
| mês/competência de início | **não existe campo próprio** — o código usa `startDate` da janela como `cycleStartDate` | idem | idem |
| periodicidade | **não existe** — IPTU/seguro são hardcoded como ciclo anual; adicionais são presumidos mensais | idem | idem |
| reajustável junto com o aluguel | **não existe em lugar nenhum** | **não** | **não** |
| repassado ao inquilino ou custo do proprietário | sim (`charge_to`: tenant/owner/agency) | sim | sim |

### `buildChargeInstallments` consegue gerar parcela sem adivinhar?

**Não. Há quatro defaults implícitos**, todos em código:

1. **Competência do ciclo** — `lease-projection.ts:293-296`: `cycleStartDate ?? fallbackStartDate ?? first`. Quem chama (`ConfirmLeaseProjectionDialog.tsx:203 e 219`) passa sempre `cycleStartDate: startDate`, ou seja, **a competência do IPTU é o mês de início do contrato/janela**, não o exercício fiscal real do IPTU. Não existe campo para o usuário dizer "este IPTU é do exercício 2026".
2. **Dia de vencimento** — `lease-projection.ts:287-290`: se `first_due_date` for nulo, cai em `fallbackDueDay`, que é o `due_day` **do aluguel** (`due_day || 10`). O `due_day` configurado por obrigação em `ObligationsConfigForm` **não chega até aqui**.
3. **Número de parcelas** — `ConfirmLeaseProjectionDialog.tsx:198 e 214`: `cfg.installments || 1`. Se vier zero/nulo, vira parcela única silenciosamente.
4. **Valor da parcela** — mesmas linhas: `installment_amount || total_amount` (seguro) e `installment_amount || annual_amount` (IPTU). Se o `installment_amount` não tiver sido calculado, **lança o valor cheio como se fosse a parcela**. Esse é o default mais perigoso dos quatro.

Além disso: **`additional_obligations` nunca é projetado.** `PlannedObligation` só admite `"rent" | "fire_insurance" | "iptu"` (`lease-projection.ts:185`). Condomínio, energia, água e gás são configuráveis no contrato, aparecem no PDF e no resumo de repasse, mas **não geram nenhuma parcela em `financial_transactions`**. Também não têm categoria em `CATEGORY_NAMES` (`useLeaseFinancialProjection.ts`).

---

## Bloco 2 — O reajuste lança obrigação junto?

Fluxo atual: `AdjustmentCalculatorDialog` aplica o reajuste, faz o cascade nas parcelas pendentes futuras e, se o checkbox "Lançar aluguéis futuros com o novo valor reajustado" estiver marcado (**marcado por padrão**), abre `ConfirmLeaseProjectionDialog` com `overrideRentAmount` e `overrideStartDate`.

O que o popup de confirmação mostra:

- **Não é só aluguel.** Mostra três blocos: Aluguel, Seguro Incêndio e IPTU (`ConfirmLeaseProjectionDialog.tsx:440-490`).
- **Vêm ligadas por padrão.** `setLaunchInsurance(!!lease.fire_insurance?.enabled)` e `setLaunchIptu(!!lease.iptu_charge?.enabled)` no reset de abertura (linhas 174-175), e o efeito de seleção marca **toda** parcela ainda inexistente das três listas (linhas 225-235).
- **Existe como desmarcar**, mas só depois de abrir: dois switches "Lançar agora" e checkbox linha a linha. Não há ação para "só obrigação, sem aluguel" — o bloco de aluguel não tem switch, sempre entra.

**Distância do comportamento desejado:** média, e é quase toda de UI. A intenção do usuário ("reajuste = só os aluguéis reajustados, com ação secundária para incluir obrigações") exige apenas inverter o default dos dois switches quando o dialog é aberto **em modo pós-reajuste**, e deixar as obrigações atrás de um botão explícito. O agravante real é que o reajuste, hoje, relança o IPTU e o seguro do **mesmo ciclo anual** que provavelmente já foi lançado no início do contrato — e faz isso com checkbox pré-marcado.

Outro ponto: o preview em `AdjustmentCalculatorDialog` ("O que será lançado") fala **só de aluguel** — imóvel, inquilino, novo valor, início, fim, parcelas estimadas. O popup seguinte então mostra IPTU e seguro que o preview não anunciou. Preview e execução divergem.

---

## Bloco 3 — Idempotência

**Sim, existe, e em duas camadas.**

1. **UI**: `useExistingLeaseCompetencies` (`useLeaseFinancialProjection.ts`) carrega `competency_period` + `obligation_type` de todas as transações com `reference = lease:<id>` e monta um `Set` de `tipo:yyyy-MM`. Cada parcela recebe `alreadyExists`, o checkbox fica desabilitado e ganha badge "Já lançado". Se tudo já existe, o dialog mostra "Não há nada a duplicar".
2. **Mutation**: antes do insert, `generateProjections` **relê** as competências existentes e filtra por `dedupKey` — a proteção não depende do estado da tela.

Repetir a operação (aplicar reajuste → lançar → repetir) portanto **não duplica**: o segundo lançamento retorna `count: 0` e o toast diz "Nenhum lançamento novo".

Três ressalvas, todas reais:

- **Não há constraint no banco.** A idempotência é só de aplicação. Duas abas em paralelo, ou qualquer insert por outro caminho, passam. Não existe unique em (`reference`, `obligation_type`, `competency_period`).
- **IPTU/seguro compartilham um único `dedupKey` para todas as N parcelas** (`lease-projection.ts:297`). Se o usuário lançar só 3 das 10 parcelas, as 7 restantes ficam **permanentemente bloqueadas** — a competência já consta como existente. Isso é uma falha de idempotência funcional, não de duplicação.
- **O dedup é por `reference = lease:<id>`.** Lançamentos criados manualmente em `/finance` para o mesmo IPTU não são vistos, e serão duplicados.

---

## O que já está bom e não deve ser tocado

- A dedupe em duas camadas de `useLeaseFinancialProjection` — releitura antes do insert é o padrão certo.
- `calculateProjectionWindow`: bloqueio por reajuste vencido, teto de 24 parcelas, `reasonLabel` explicando a janela.
- `calculateDueDate` com clamp de meses curtos.
- Competência única por ciclo anual para IPTU/seguro (a correção do `ARQ-STATUS-CATEGORIAS-CONTRATO`) — o conceito está certo; falta só o usuário poder escolher **qual** ciclo.
- `charge_to` com taxonomia tenant/owner/agency alinhada à Matriz de Responsabilidades.
- "Nada é lançado até você confirmar" + atalho "Lançar a partir de".

---

## Prioridade do que vale mudar

### Ajuste só de UI (sem tocar no banco)

| # | O quê | Esforço |
|---|---|---|
| 1 | No modo pós-reajuste, abrir o dialog com `launchInsurance`/`launchIptu` **desligados** e as obrigações recolhidas atrás de um botão "Incluir obrigações neste lançamento". | baixo |
| 2 | Alinhar o preview do `AdjustmentCalculatorDialog` com o que será realmente lançado (hoje anuncia só aluguel). | baixo |
| 3 | Substituir o fallback silencioso `installment_amount \|\| total_amount` por aviso explícito quando o valor da parcela não estiver calculado. | baixo |
| 4 | Adicionar switch "Lançar agora" também no bloco Aluguel, permitindo "só obrigação". | baixo |
| 5 | Expor `installments` e `installment_amount` como campos editáveis no próprio dialog para IPTU/seguro, como já é feito com aluguel. | médio |

### Campo que falta no banco / no modelo

| # | O quê | Esforço |
|---|---|---|
| 6 | `dedupKey` por parcela (`tipo:competência:índice`) em vez de por ciclo — destrava o lançamento parcial de IPTU. Só código, mas muda a semântica dos dados já gravados. | médio |
| 7 | Campo de **competência/exercício** próprio em `iptu_charge` e `fire_insurance` (ex.: `cycle_year` ou `competency_month`), em vez de herdar do início do contrato. | médio |
| 8 | Suporte a `additional_obligations` na projeção: ampliar `PlannedObligation`, dar categoria financeira a cada tipo e adicionar os blocos no dialog. Hoje condomínio/energia/água/gás são configuráveis e nunca viram parcela. | alto |
| 9 | Campo `periodicity` por obrigação (mensal / anual / parcelada) — hoje é hardcoded por tipo. | médio |
| 10 | Flag `adjustable_with_rent` por obrigação. Hoje o cascade de reajuste atualiza **toda** transação pendente com `reference = lease:<id>`, incluindo IPTU e seguro, sem distinção de tipo — o `.update({ amount: newValue })` em `AdjustmentCalculatorDialog.tsx:203-209` não filtra por `obligation_type`. Isso reescreve o valor do IPTU pendente com o valor do aluguel. | médio |
| 11 | Unique index em (`reference`, `obligation_type`, `competency_period`) para tornar a idempotência garantia de banco. | baixo |
| 12 | Propagar o `due_day` por obrigação de `units.obligations_config` até a projeção (hoje é descartado e o dia do aluguel é usado). | médio |

O item **10** é o mais grave da lista inteira: não é ergonomia, é corrupção silenciosa de valor em parcela de IPTU e seguro a cada reajuste aplicado.
