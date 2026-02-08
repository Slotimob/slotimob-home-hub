# Memory: features/contract-automation
Updated: now

## Sistema de Documentos Refatorado

O sistema de documentos foi completamente refatorado para uma central de automação contratual mais limpa e funcional.

### Mudanças Principais

1. **PDF Generator (`src/utils/pdfGenerator.ts`)**:
   - Removidos símbolos decorativos (%, ━, █) e substituídos por `doc.line()` real
   - Variáveis não preenchidas `{{exemplo}}` agora mostram linha pontilhada `..............................`
   - Margens: 20mm (esquerda/direita), 25mm (topo/fundo)
   - Fonte: Helvetica (padrão seguro)
   - Cores centralizadas em objeto `COLORS`
   - Watermark e footer profissionais em todas as páginas

2. **Auto-fill Removido**:
   - Deletados: `AutoFillSelector.tsx`, `useAutoFillData.ts`
   - Sistema simplificado sem preenchimento automático

3. **DocumentEditorDialog Refatorado**:
   - Layout split desktop: formulário à esquerda, preview à direita (scroll independente)
   - Layout mobile: abas [Preencher] / [Visualizar]
   - Badge de status: "Modelo Padrão" ou "Modelo Editado"
   - Auto-save antes de "Gerar PDF" ou "Enviar" (salva em `generated_documents`)
   - Botão "Salvar Modelo" cria novo registro em `contract_templates` com campos preenchidos

4. **Aba "Rascunhos" (antes "Histórico")**:
   - Renomeada para deixar claro que são documentos pré-preenchidos
   - Botão "Continuar" para retomar edição
   - Badge visual indicando "Rascunho"

5. **Aba "Modelos Personalizados"**:
   - Lista modelos salvos pelo usuário (`contract_templates` com `broker_id`)
   - Ações: Editar, Baixar PDF, Excluir
   - Empty state com link para "Modelos Padrão"

### Tabelas Utilizadas

- `contract_templates`: Modelos personalizados (vinculados ao `broker_id`)
- `generated_documents`: Rascunhos/histórico de documentos gerados
- `documents`: Arquivos enviados/upload

### Fluxo de Persistência

1. Usuário abre modelo padrão → preenche campos
2. Ao clicar "Gerar PDF" ou "Enviar" → auto-save em `generated_documents`
3. Ao clicar "Salvar Modelo" → cria novo em `contract_templates` com campos preenchidos
4. Rascunhos aparecem na aba "Rascunhos"
5. Modelos salvos aparecem na aba "Modelos Personalizados"
