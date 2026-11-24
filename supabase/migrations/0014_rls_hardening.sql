-- =============================================================================
-- 0014_rls_hardening.sql
-- Security Hardening: Anti-self-escalation, immutable audit log,
-- and price-lock after booking confirmation.
-- =============================================================================

-- 1. Anti-Self-Escalation on profiles.role
-- Non-admin callers cannot change their own (or anyone else's) role to 'admin' or 'provider'.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can change user roles.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 2. Price lock after acceptance
-- Once a booking moves beyond 'pending' (i.e. confirmed, in_progress, completed),
-- the agreed total_price is frozen and cannot be mutated by customer or provider.
CREATE OR REPLACE FUNCTION public.prevent_price_tampering_after_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.total_price IS DISTINCT FROM NEW.total_price) AND OLD.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Price tampering forbidden: Booking price cannot be altered after acceptance (status: %)', OLD.status
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_price_tampering ON public.bookings;
CREATE TRIGGER trg_prevent_price_tampering
  BEFORE UPDATE OF total_price ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_price_tampering_after_acceptance();

-- 3. Strictly Append-Only Audit Trail (admin_actions)
-- Prevent any modification or deletion of past administrative audit logs.
REVOKE UPDATE, DELETE ON public.admin_actions FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.prevent_admin_actions_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'admin_actions audit log is strictly append-only. Modification or deletion is forbidden.'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_actions_immutable ON public.admin_actions;
CREATE TRIGGER trg_admin_actions_immutable
  BEFORE UPDATE OR DELETE ON public.admin_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_actions_mutation();
