

# Atalhos Inteligentes para Contatos

## O que muda

Apenas uma pequena alteracao em `ContactsUnified.tsx` e a adicao de 3 rotas em `App.tsx`. Zero mudancas visuais.

## Alteracoes

### 1. App.tsx - Adicionar sub-rotas

Registrar 3 novas rotas que apontam para o mesmo componente `ContactsUnified`:

```text
/contacts/owners  -> ContactsUnified
/contacts/leads   -> ContactsUnified
/contacts/companies -> ContactsUnified
```

### 2. ContactsUnified.tsx - Ler o pathname na inicializacao

- Importar `useLocation` do react-router-dom
- Criar um mapeamento simples de slug para categoria:
  - `owners` -> `Proprietario`
  - `leads` -> `Lead`
  - `companies` -> `Empresa`
- Adicionar um `useEffect` que roda **uma unica vez** ao montar o componente: se o pathname contem um slug conhecido, define o `selectedCategory` inicial correspondente
- Se a rota for apenas `/contacts`, nao faz nada (comportamento atual preservado)

Nenhuma outra parte do componente e tocada: layout, filtros, listagem, paginacao, modais -- tudo permanece identico.

### 3. Remocao de WhatsAppSettings (do plano anterior)

- Remover rota `/whatsapp/settings` do `App.tsx` e deletar `WhatsAppSettings.tsx`
- Corrigir link em `WhatsApp.tsx`: `/whatsapp-settings` -> `/integrations`
- Remover entrada em `Breadcrumbs.tsx`

