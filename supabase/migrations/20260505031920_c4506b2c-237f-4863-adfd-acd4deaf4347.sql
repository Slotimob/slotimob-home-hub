
-- =====================================================
-- PASSO 1: Habilitar RLS em todas as partições existentes
-- =====================================================
DO $$
DECLARE
  partition_record RECORD;
BEGIN
  FOR partition_record IN
    SELECT child.relname AS partition_name
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    JOIN pg_namespace ns ON ns.oid = parent.relnamespace
    WHERE parent.relname = 'audit_logs'
      AND ns.nspname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', partition_record.partition_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', partition_record.partition_name);
    RAISE NOTICE 'RLS habilitado em %', partition_record.partition_name;
  END LOOP;
END $$;

-- =====================================================
-- PASSO 2: Replicar policies da tabela mãe nas partições
-- =====================================================
DO $$
DECLARE
  partition_record RECORD;
  policy_record RECORD;
BEGIN
  FOR partition_record IN
    SELECT child.relname AS partition_name
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    JOIN pg_namespace ns ON ns.oid = parent.relnamespace
    WHERE parent.relname = 'audit_logs'
      AND ns.nspname = 'public'
  LOOP
    FOR policy_record IN
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'audit_logs'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        policy_record.policyname, partition_record.partition_name);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO %s %s %s',
        policy_record.policyname,
        partition_record.partition_name,
        policy_record.cmd,
        array_to_string(policy_record.roles, ', '),
        CASE WHEN policy_record.qual IS NOT NULL
          THEN format('USING (%s)', policy_record.qual)
          ELSE '' END,
        CASE WHEN policy_record.with_check IS NOT NULL
          THEN format('WITH CHECK (%s)', policy_record.with_check)
          ELSE '' END
      );

      RAISE NOTICE 'Policy "%" replicada em %',
        policy_record.policyname, partition_record.partition_name;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- PASSO 3: Atualizar maintain_audit_partitions para
--          aplicar RLS + policies em partições futuras
-- =====================================================
CREATE OR REPLACE FUNCTION public.maintain_audit_partitions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_month date;
  v_next date;
  v_name text;
  v_policy RECORD;
BEGIN
  -- Criar partições dos próximos 3 meses
  FOR i IN 0..2 LOOP
    v_month := date_trunc('month', current_date + (i || ' months')::interval)::date;
    v_next := (v_month + interval '1 month')::date;
    v_name := 'audit_logs_' || to_char(v_month, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_name) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L)',
        v_name, v_month, v_next
      );
      EXECUTE format('GRANT SELECT, INSERT ON public.%I TO authenticated, anon, service_role', v_name);
    END IF;

    -- Garantir RLS habilitado (idempotente)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_name);

    -- Replicar policies da tabela mãe (idempotente)
    FOR v_policy IN
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'audit_logs'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        v_policy.policyname, v_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO %s %s %s',
        v_policy.policyname,
        v_name,
        v_policy.cmd,
        array_to_string(v_policy.roles, ', '),
        CASE WHEN v_policy.qual IS NOT NULL
          THEN format('USING (%s)', v_policy.qual)
          ELSE '' END,
        CASE WHEN v_policy.with_check IS NOT NULL
          THEN format('WITH CHECK (%s)', v_policy.with_check)
          ELSE '' END
      );
    END LOOP;
  END LOOP;

  -- Dropar partições mais velhas que 90 dias
  FOR v_name IN
    SELECT c.relname FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = 'audit_logs' AND c.relname ~ '^audit_logs_\d{4}_\d{2}$'
  LOOP
    v_month := to_date(substring(v_name from 'audit_logs_(\d{4}_\d{2})'), 'YYYY_MM');
    IF v_month + interval '1 month' < current_date - interval '90 days' THEN
      EXECUTE format('DROP TABLE IF EXISTS public.%I', v_name);
    END IF;
  END LOOP;
END;
$function$;

-- =====================================================
-- PASSO 4: Também proteger audit_logs_default
-- (já coberto pelo loop acima, mas garantir RLS+policies)
-- =====================================================
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_logs_default') THEN
    ALTER TABLE public.audit_logs_default ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_logs_default FORCE ROW LEVEL SECURITY;

    FOR v_policy IN
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'audit_logs'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs_default', v_policy.policyname);
      EXECUTE format(
        'CREATE POLICY %I ON public.audit_logs_default FOR %s TO %s %s %s',
        v_policy.policyname,
        v_policy.cmd,
        array_to_string(v_policy.roles, ', '),
        CASE WHEN v_policy.qual IS NOT NULL
          THEN format('USING (%s)', v_policy.qual)
          ELSE '' END,
        CASE WHEN v_policy.with_check IS NOT NULL
          THEN format('WITH CHECK (%s)', v_policy.with_check)
          ELSE '' END
      );
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- PASSO 5: Validação — falha se alguma partição sem RLS
-- =====================================================
DO $$
DECLARE
  v_unprotected_count INT;
  v_unprotected_list TEXT;
BEGIN
  SELECT COUNT(*), string_agg(child.relname, ', ')
  INTO v_unprotected_count, v_unprotected_list
  FROM pg_inherits
  JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
  JOIN pg_class child ON pg_inherits.inhrelid = child.oid
  JOIN pg_namespace ns ON ns.oid = parent.relnamespace
  WHERE parent.relname = 'audit_logs'
    AND ns.nspname = 'public'
    AND child.relrowsecurity = false;

  IF v_unprotected_count > 0 THEN
    RAISE EXCEPTION 'FALHA: Partições sem RLS detectadas: %', v_unprotected_list;
  END IF;

  RAISE NOTICE 'Validação OK: todas as % partições de audit_logs têm RLS habilitado', (
    SELECT COUNT(*) FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    JOIN pg_namespace ns ON ns.oid = parent.relnamespace
    WHERE parent.relname = 'audit_logs' AND ns.nspname = 'public'
  );
END $$;
