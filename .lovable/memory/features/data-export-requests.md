---
name: Data Export Requests
description: Manual data export workflow — client requests, admin delivers via Storage, signed URLs for download
type: feature
---

- Table `data_export_requests` with unique partial index (1 active per owner)
- Bucket `client-deliveries` (private, 5GB limit, service_role write only)
- Client page: `/settings/data-export` (owner only, hidden for members)
- Admin page: `/admin/data-requests` (is_super_admin only)
- Edge Functions: `upload-export-delivery`, `get-delivery-url`, `purge-expired-deliveries`
- `delete-account` now requires recent export OR `skip_export_check: true`
- Account closure reason triggers 30-day signed URL in email
- Audit trigger logs all status transitions
- `profiles.is_super_admin` column for SLOTIMOB staff access
