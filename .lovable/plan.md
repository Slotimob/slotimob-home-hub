

# Fix: WhatsApp QR Code Generation via Webhook Configuration

## Problem

The Evolution API's `/instance/create` endpoint only accepts a simple webhook URL. It silently ignores `events`, `webhook_base64`, and other settings passed in the create payload. This is confirmed by the response showing `"webhook":{"webhookUrl":"..."}` with no events registered and `"qrcode":{"count":0}`.

Without the `QRCODE_UPDATED` event subscription and `webhook_base64: true`, the QR code image is never sent to our webhook.

## Solution

Split the instance setup into two steps:

1. **Create the instance** with a simple webhook URL string
2. **Configure the webhook** via `POST /webhook/set/{instanceName}` to register events and enable base64

Then call `GET /instance/connect/{instanceName}` to trigger QR code generation.

## Technical Details

### File: `supabase/functions/whatsapp-instance/index.ts`

**Step 1 - Simplify create payload:**
```typescript
body: JSON.stringify({
  instanceName: instanceName,
  qrcode: true,
  integration: 'WHATSAPP-BAILEYS',
})
```

**Step 2 - After successful creation, configure webhook separately:**
```typescript
const webhookSetRes = await fetch(
  `${evolutionApiUrl}/webhook/set/${instanceName}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: evolutionApiKey },
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: true,
      events: [
        'QRCODE_UPDATED',
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
      ],
    }),
  }
);
console.log('Webhook set status:', webhookSetRes.status);
```

**Step 3 - Call connect to trigger QR generation:**
```typescript
const connectRes = await fetch(
  `${evolutionApiUrl}/instance/connect/${instanceName}`,
  { method: 'GET', headers: { apikey: evolutionApiKey } }
);
```

**Apply the same pattern to the retry (delete/recreate) flow.**

### Summary of Changes

- Remove webhook config from the create payload (only `instanceName`, `qrcode`, `integration`)
- Add a new `POST /webhook/set/{instanceName}` call after each successful creation
- Log the webhook set response for debugging
- Keep the rest of the function (status, disconnect, refresh_qr) unchanged
