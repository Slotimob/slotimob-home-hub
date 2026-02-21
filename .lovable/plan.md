

# Fix: Webhook Set Payload Must Be Wrapped in `webhook` Object

## Root Cause

The logs show this error repeatedly:
```
Webhook set status: 400
{"message":[["instance requires property \"webhook\""]]}
```

The Evolution API's `POST /webhook/set/{instanceName}` endpoint expects the configuration nested inside a `webhook` key, not as flat top-level properties.

## Current (broken)
```json
{
  "enabled": true,
  "url": "https://...",
  "webhook_by_events": false,
  "webhook_base64": true,
  "events": [...]
}
```

## Fix
```json
{
  "webhook": {
    "enabled": true,
    "url": "https://...",
    "webhook_by_events": false,
    "webhook_base64": true,
    "events": [...]
  }
}
```

## Technical Details

### File: `supabase/functions/whatsapp-instance/index.ts`

Lines 109-115 -- wrap the existing properties inside a `webhook` object:

```typescript
body: JSON.stringify({
  webhook: {
    enabled: true,
    url: webhookUrl,
    webhook_by_events: false,
    webhook_base64: true,
    events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
  }
}),
```

This is the only change needed. The instance creation (Step 1) and connect call (Step 3) are working correctly -- only the webhook configuration call (Step 2) is failing.

