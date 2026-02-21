

# Plan: Fix WhatsApp QR Code Generation

## Problem Diagnosis

After analyzing logs, database state, and code, I identified **two root causes** preventing QR code generation:

1. **`whatsapp-webhook` is still using Meta's payload format.** Evolution API sends events like `{"event": "connection.update", "instance": "slotimob_...", "data": {"state": "connecting"}}`, but the webhook still looks for `body.entry[0].changes` (Meta format) and discards everything else. This means:
   - QR code updates via `QRCODE_UPDATED` events are ignored
   - `connection.update` events with `state: "open"` are ignored (connection never marked as connected)

2. **The `whatsapp-instance` create response may not include the QR code inline.** The Evolution API often returns the QR code asynchronously through the webhook (`QRCODE_UPDATED` event). Since the webhook ignores it, the QR code is never stored in the database, and the frontend never receives it.

## Solution

### Step 1: Rewrite `whatsapp-webhook` for Evolution API

Replace the Meta-format processing with Evolution API event handling:

- Parse Evolution payload format: `{ event, instance, data }`
- Handle `connection.update` event:
  - If `state === "open"`: update `whatsapp_connections` to `status: 'connected'`, `connection_status: 'open'`, clear `qr_code_base64`
  - If `state === "close"`: update status to `disconnected`
- Handle `qrcode.updated` event:
  - Extract base64 QR from `data.qrcode.base64`
  - Update `whatsapp_connections` with the QR code and set `connection_status: 'qrcode'`
- Handle `messages.upsert` event:
  - Extract message from `data` array
  - Find connection by `instance_name`
  - Create/update contacts and conversations (reuse existing CRM logic)
  - Insert messages into `whatsapp_messages`
- Keep returning 200 for all requests to prevent webhook disabling

### Step 2: Improve `whatsapp-instance` QR code retrieval

After creating the instance, if no QR code is returned inline:
- Call `GET /instance/connect/{instanceName}` to explicitly request the QR
- Store whatever QR code is available immediately
- The webhook will update it asynchronously if needed

### Step 3: Frontend Realtime already works

The `Integrations.tsx` page already listens to Realtime updates on `whatsapp_connections`. Once the webhook correctly updates `qr_code_base64` and `connection_status`, the frontend will automatically:
- Show the QR code when `qr_code_base64` is populated
- Close the dialog when `connection_status` changes to `open`

## Files to Modify

1. **`supabase/functions/whatsapp-webhook/index.ts`** -- Full rewrite from Meta format to Evolution API format
2. **`supabase/functions/whatsapp-instance/index.ts`** -- Minor improvement to QR code retrieval after instance creation

## Technical Details

### Evolution API Webhook Payload Examples

Connection update:
```json
{
  "event": "connection.update",
  "instance": "slotimob_b52081c9b1844125",
  "data": { "state": "open" }
}
```

QR Code update:
```json
{
  "event": "qrcode.updated",
  "instance": "slotimob_b52081c9b1844125",
  "data": { "qrcode": { "base64": "data:image/png;base64,..." } }
}
```

Messages:
```json
{
  "event": "messages.upsert",
  "instance": "slotimob_b52081c9b1844125",
  "data": [{ "key": { "remoteJid": "5511999999999@s.whatsapp.net", "id": "MSG_ID" }, "message": { "conversation": "Hello" } }]
}
```

### Webhook Event-to-Action Mapping

| Evolution Event | Action |
|---|---|
| `connection.update` (state=open) | Mark connection as connected, clear QR |
| `connection.update` (state=close) | Mark connection as disconnected |
| `qrcode.updated` | Store QR base64 in DB, set status to qrcode |
| `messages.upsert` | Process incoming message, create contact, save to DB |

