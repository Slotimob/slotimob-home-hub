# Diagnóstico + Plano — Pedidos 4 e 5

## PEDIDO 4 — Ordem do fluxo de Boleto no wizard de contrato

Arquivo: `src/pages/gestao/NovoContrato.tsx`

Estrutura atual do bloco `paymentInfo.tipo === "boleto"` (linhas 1378–1470+):

```text
1380  const emissao = paymentInfo.emissao_boleto ?? "asaas"
1383  "Como o boleto será emitido?"  <- 2 botões (própria / Asaas)   [PRIMEIRO]
1403  "Dados do Pagador" (leitura: nome, doc, e-mail do inquilino)
1433  {emissao === "asaas" && ( ... )}   <- CONDICIONAMENTO CONFIRMADO
1437     "Configurações de Cobrança"
           - Multa por atraso (%)        (fine_value)
           - Juros ao mês (%)            (interest_value)
           - Desconto (R$)               (discount_value)
           - Dias antes do vencimento para desconto (discount_due_date_limit_days,
             só aparece se desconto > 0)
1487     "Enviar boleto por": checkbox E-mail (send_email), checkbox WhatsApp (send_whatsapp)
1513  Bloco informativo, varia conforme emissao === "propria" / "asaas"
```

Confirmações:
1. O condicionamento existe e é exatamente `{emissao === "asaas" && (<> ... </>)}` na linha 1433, envolvendo "Configurações de Cobrança" + "Enviar boleto por".
2. Campos reais de cobrança são os 4 numéricos + os 2 checkboxes acima (o "dia de vencimento" NÃO está aqui — ele é `due_day`, no step `financial`).
3. Fluxo esperado está correto: nada é emitido ao finalizar o wizard. Em `NovoContrato.tsx` a única referência a Asaas é a query `asaas-account-status` (linha 224) para checar se a conta existe; não há chamada a `create-asaas-charge` no submit. O contrato apenas grava `emissao_boleto` + configs, e a emissão real (avulsa ou automática) acontece depois na aba Cobrança/Boletos do contrato.

### Mudança proposta (Pedido 4)
Dentro do bloco de boleto, reordenar para:
1. "Dados do Pagador" (mantém no topo, é contexto de leitura).
2. "Configurações de Cobrança" — SEMPRE visível quando tipo = boleto (remover o wrapper `emissao === "asaas" &&`).
3. "Enviar boleto por" — também sempre visível.
4. "Como o boleto será emitido?" (os 2 botões) — movido para o FINAL do bloco.
5. O bloco informativo condicional permanece por último, logo abaixo da escolha de emissão.

Ajuste de rótulo: quando `emissao === "propria"`, adicionar nota curta de que as configurações servem de referência/registro (não há automação). Nenhuma mudança em persistência, `useLeases.ts` ou validação de step.

## PEDIDO 5 — Padronizar "Editar Contato" com "Novo Contato"

São **2 componentes totalmente separados** — duplicação real, sem reaproveitamento:
- `src/components/contacts/CreateContactDialog.tsx` (622 linhas)
- `src/components/contacts/EditContactDialog.tsx` (438 linhas)

### Máscaras
Create tem máscaras próprias (helpers de formatação, não biblioteca externa):
- `handleDocumentChange` (linha 174): aplica `formatCPF` / `formatCNPJ` conforme `document_type`.
- `handlePhoneChange` (linha 168): aplica `formatPhone` em `phone` e `whatsapp`.
- `handleCepChange` (linha 145) + `handleCepBlur`: `formatCEP`, `cleanCEP` e busca ViaCEP.
- `handleDocumentTypeChange` (linha 181): limpa o documento ao trocar CPF↔CNPJ.
- No submit (linhas 238–250): `cleanPhone` / `cleanDocument` antes de salvar.

Edit usa `<Input>` puro, sem máscara nenhuma:
- Telefone: linha 249–252, `onChange` grava valor cru.
- WhatsApp: linha 255.
- Documento: linha 283–286, valor cru.
- CEP: linha 293, sem `formatCEP`; `handleCepBlur` (linha 100) usa `formData.postal_code` sem limpeza.
- Submit (linhas 156–159): grava `.trim()` cru, sem `cleanPhone`/`cleanDocument` — logo edições podem gravar formatos inconsistentes no banco.

### Ordem dos campos (diferente hoje)
- Create: Categorias → Nome → Email → Tipo de Documento → Número do Documento → Telefone → WhatsApp → CEP → Endereço → Bairro → Cidade → Estado → Orçamento → Origem → Website/Pessoa de Contato → Observações. Tem ainda seleção de unidades quando categoria "Inquilino" e `interest_type`.
- Edit: Categorias → Nome → Email → **Telefone → WhatsApp → Tipo de Documento → Número do Documento** → CEP → ... → Observações. Não tem vínculo de unidades nem `interest_type`.

### Call sites
`CreateContactDialog` (5):
- `src/pages/ContactsUnified.tsx:616`
- `src/components/dashboard/ShortcutsWidget.tsx:148`
- `src/components/units/UnitFormFields.tsx:875`
- `src/components/units/UnitSubdivisionsPanel.tsx:455`
- `src/components/whatsapp/CrmContextPanel.tsx:566`

`EditContactDialog` (1 só):
- `src/pages/ContactsUnified.tsx:624` — aberto por 3 gatilhos internos da mesma página: menu do `ContactCard` (linha 122), menu do `ContactListItem` (linha 155) e botão "Editar" do `ContactDetailSheet` (linha 99), todos via `onEdit`.

### Recomendação (Pedido 5)
Alinhar o Edit ao Create **sem unificar os componentes**, e sem tocar em nenhum call site (Edit tem só um). Unificar num componente único com modo create/edit seria a refatoração mais "limpa", mas mexeria nos 5 call sites do Create e no fluxo de vínculo de unidades — risco desnecessário agora.

Trabalho no `EditContactDialog.tsx`:
1. Importar os mesmos helpers usados no Create (`formatCPF`, `formatCNPJ`, `formatPhone`, `formatCEP`, `cleanPhone`, `cleanDocument`, `cleanCEP`).
2. Adicionar `handlePhoneChange`, `handleDocumentChange`, `handleDocumentTypeChange`, `handleCepChange` idênticos aos do Create.
3. Ao carregar o contato no `useEffect`, formatar os valores vindos do banco (telefone/whatsapp/documento/CEP) para exibição mascarada.
4. No submit, limpar com `cleanPhone` / `cleanDocument` / `cleanCEP` antes de gravar — mesma normalização do Create.
5. Reordenar os campos para a ordem do Create (documento antes de telefone) e igualar rótulos ("Nome / Razão Social *", textos de ajuda).
6. Fora de escopo (a confirmar se você quer): trazer vínculo de unidades para "Inquilino" e `interest_type` para o Edit.

## Detalhes técnicos
- Nenhuma migração de banco; nenhuma mudança em `useLeases.ts` nem em Edge Functions.
- Pedido 4 é reordenação de JSX + remoção de um wrapper condicional; Pedido 5 é reescrita interna de um dialog.
- Validação final: build + typecheck.
