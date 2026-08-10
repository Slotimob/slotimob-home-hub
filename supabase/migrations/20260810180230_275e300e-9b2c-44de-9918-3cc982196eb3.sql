DROP TRIGGER IF EXISTS audit_unit_tenant_history ON public.unit_tenant_history;

CREATE TRIGGER audit_unit_tenant_history
AFTER INSERT OR UPDATE ON public.unit_tenant_history
FOR EACH ROW EXECUTE FUNCTION public.log_audit_with_asset_context();