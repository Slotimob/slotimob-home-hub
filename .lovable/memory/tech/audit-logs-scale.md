---
name: Audit Logs Scale Architecture
description: Partitioned audit_logs, workspace RLS, diff triggers, actor_user_id, 90-day retention
type: feature
---

## Partitioned Table
- `audit_logs` is PARTITION BY RANGE (created_at) with monthly partitions
- `audit_logs_legacy` preserves original data (drop after 30 days)
- `audit_logs_default` catches historical data, `audit_logs_YYYY_MM` for months
- PK is composite (id, created_at) — required for partitioning

## RLS: Workspace-Aware (Parent + Partitions)
- `can_view_audit_log(viewer, broker_id)`: owner sees all workspace members' logs, members see only own
- **CRITICAL**: RLS on parent table does NOT propagate to partitions in Postgres
- Every partition must have `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
- Every partition must replicate parent policies ("System can insert audit logs" INSERT, "Workspace can view audit logs" SELECT)
- `maintain_audit_partitions()` handles this automatically for new partitions

## Diff Optimization
- `audit_diff(old, new)` returns only changed fields (excludes updated_at, search_vector)
- UPDATEs with no meaningful changes are skipped entirely
- INSERT/DELETE still store full row (needed for lixeira/restore)

## actor_user_id Column
- Distinguishes who performed the action from which workspace owns the data
- All triggers updated to set `actor_user_id = auth.uid()`
- Historical records have `actor_user_id = broker_id`

## Partition Maintenance
- `maintain_audit_partitions()` RPC: creates next 3 months, drops partitions > 90 days
- **Also applies RLS + replicates policies** on every run (idempotent)
- Edge Function `audit-logs-retention` calls this RPC (verify_jwt=false for cron)
- Grants SELECT/INSERT to authenticated/anon/service_role on new partitions

## Indexes
- (broker_id, created_at DESC) — composite, replaces old individual indexes
- (table_name, created_at DESC)
- (action)
- (metadata->>'property_id') WHERE metadata ? 'property_id'
- (metadata->>'unit_id') WHERE metadata ? 'unit_id'
- (actor_user_id, created_at DESC)
