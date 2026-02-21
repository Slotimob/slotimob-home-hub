

# Reestruturação da Página Integrações - WhatsApp Sincronizado

## Problema Identificado

A página **Integrações** (`/integrations`) possui lógica duplicada e desatualizada para o WhatsApp. Ela gerencia estado local, cria sua própria assinatura Realtime e tem handlers separados -- tudo isso já existe de forma mais robusta nos hooks centralizados (`useWhatsAppSettingsConnection` e `useWhatsAppGlobalListener`). Resultado: a página não mostra o estado "preparing" com barra de progresso, não tem timer de expiração do QR, e não se beneficia da lógica assíncrona de segundo plano.

## O que será feito

### 1. Refatorar Integrations.tsx para usar o hook centralizado

- Remover todo o estado local de WhatsApp (variáveis `whatsappConnection`, `qrCodeBase64`, `isConnecting`, `isDisconnecting`, e a assinatura Realtime duplicada).
- Importar e usar `useWhatsAppSettingsConnection` do hook existente, que já inclui Realtime e gerenciamento de estado.
- O botão "Conectar WhatsApp" chamará a mesma lógica da página WhatsAppSettings (invoke `whatsapp-instance` com `action: 'create'`).

### 2. Adicionar estado "Preparing" com barra de progresso

- Quando `connection_status === 'preparing'` ou `waitingForQr === true`, exibir uma barra de progresso animada e a mensagem: *"Nosso servidor está configurando sua instância em segundo plano. Você pode continuar navegando na plataforma..."*

### 3. Auto-Update do QR Code via Realtime

- Quando o Realtime detectar que `qr_code_base64` foi preenchido, o QR Code aparecerá automaticamente na página sem necessidade de refresh.
- Incluir o timer de expiração de 14 segundos (reutilizando o componente `QrExpiryTimer` da WhatsAppSettings ou criando um compartilhado).

### 4. Corrigir o Global Listener

- Alterar o link no toast do `useWhatsAppGlobalListener` de `/whatsapp/settings` para `/integrations`, já que essa é a página principal de conexão.

### 5. Eliminar o Dialog de QR Code separado

- Em vez de abrir um Dialog modal para o QR, exibir o QR Code diretamente no card do WhatsApp (inline), com a mesma experiência da página WhatsAppSettings.

---

## Detalhes Técnicos

### Arquivos modificados:

**`src/pages/Integrations.tsx`**
- Remover: estados `whatsappConnection`, `qrCodeBase64`, `qrDialogOpen`, `isConnecting`, `isDisconnecting`
- Remover: `useEffect` de Realtime (linhas 50-78)
- Remover: funções `loadWhatsAppConnection`, `handleConnectWhatsApp`, `handleRefreshQr`, `handleDisconnectWhatsApp`
- Remover: componente `Dialog` do QR Code (linhas 358-399)
- Adicionar: `import { useWhatsAppSettingsConnection } from '@/hooks/useWhatsApp'`
- Adicionar: `import { Progress } from '@/components/ui/progress'`
- Usar `connection`, `waitingForQr`, `setWaitingForQr`, `refetch` do hook
- Adicionar estados derivados: `isPreparing`, `isConnected`, `hasQrCode`
- No card WhatsApp:
  - Badge "Preparando..." quando `isPreparing`
  - Bloco de barra de progresso animada + mensagem quando `isPreparing && !hasQrCode`
  - QR Code inline com timer de 14s quando `hasQrCode && !isConnected`
  - Estado "QR expirado" com botão de refresh
  - Botões de ação: "Abrir Chat" (conectado), "Desconectar", "Conectar WhatsApp"

**`src/hooks/useWhatsAppGlobalListener.tsx`**
- Alterar `navigate('/whatsapp/settings')` para `navigate('/integrations')` no toast de QR pronto

**Nenhum arquivo novo** -- reutilizamos hooks e componentes existentes.

### Fluxo final unificado:

```text
Usuário clica "Conectar WhatsApp" (Integrations)
       |
       v
Edge Function cria instância -> retorna status 200 (preparing)
       |
       v
Card mostra barra de progresso animada
"Servidor configurando em segundo plano..."
       |
       v
[Se sair da página] -> Global Listener mostra Toast
"WhatsApp pronto! Ir para Conectar" -> navega para /integrations
       |
       v
[Se ficar na página] -> Realtime atualiza automaticamente
QR Code aparece inline no card + timer 14s
       |
       v
Usuário escaneia -> Realtime detecta status 'open'
Card mostra "Conectado" + botão "Abrir Chat"
```
