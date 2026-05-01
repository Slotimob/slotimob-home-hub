---
name: Bulk Action Approval System
description: Gate for bulk actions requiring owner approval when threshold exceeded, with approval requests workflow
type: feature
---

## Tables
- `approval_thresholds`: per-workspace config (action_type, threshold, enabled, approval_validity_hours)
- `approval_requests`: solicitações with status flow pending→approved/rejected→consumed/expired

## Hook
- `useBulkActionGate` in `src/hooks/useBulkActionGate.ts`
- Owner always bypasses (owner_self). Members check threshold, then look for approved passe.
- `consume_approval` RPC marks approved request as consumed (one-shot).

## UI
- `RequestApprovalDialog` — modal for member to submit justification
- `ApprovalStatusBanner` — shown in AppLayout for members with pending/approved/rejected requests
- `/admin/approvals` — owner-only page with Solicitações + Configurações tabs
- Sidebar: "Aprovações" (ShieldCheck) visible only for owners, between Cockpit Master and Configurações

## Integrated Points
- UnitsBulkActionsBar: bulk_delete, bulk_status_change
- TransactionsBulkActionsBar: bulk_delete
- Pipeline (BulkActionsBar): bulk_status_change

## Constants
- `src/utils/approvalConstants.ts`: ACTION_TYPE_LABELS, ACTION_TYPE_ORDER, DEFAULT_THRESHOLDS
