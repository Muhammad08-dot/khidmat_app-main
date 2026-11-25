-- =============================================================================
-- 0014_rls_hardening.sql
-- Task P3-4: Anti-role escalation, immutable admin_actions audit log,
-- price-lock after booking confirmation, cross-user read protections,
-- and authorized booking transitions.
-- Fully idempotent migration with admin bootstrap path & completion price lock.
-- =============================================================================

-- 1. Anti-Self-Escalation on profiles.role
-- Allows role change only by existing admins, service_role callers, or direct SQL (auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Admin bootstrap path: Allow if executed via direct SQL/seed (auth.uid() IS NULL),
    -- service_role key, or by an authorized admin user.
    IF auth.uid() IS NOT NULL
       AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only platform administrators can change user roles.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 2. Price lock after acceptance vs completion
-- Once a booking moves beyond 'pending', estimated_price is locked forever.
-- total_price can be finalized once during completion (if previously NULL),
-- but once set, cannot be altered by non-admins.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_price INTEGER;

CREATE OR REPLACE FUNCTION public.prevent_price_tampering_after_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- 1. estimated_price can NEVER be altered once booking is accepted / beyond pending
    IF (OLD.estimated_price IS DISTINCT FROM NEW.estimated_price)
       AND OLD.status NOT IN ('pending') THEN
      RAISE EXCEPTION 'Price tampering forbidden: Estimated price cannot be altered after acceptance (status: %)', OLD.status
        USING ERRCODE = '22023';
    END IF;

    -- 2. total_price can be set once during completion if previously NULL, but cannot be modified once finalized
    IF OLD.total_price IS NOT NULL
       AND NEW.total_price IS DISTINCT FROM OLD.total_price
       AND OLD.status NOT IN ('pending') THEN
      RAISE EXCEPTION 'Price tampering forbidden: Final total price is locked and cannot be altered (status: %)', OLD.status
        USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_price_tampering ON public.bookings;
CREATE TRIGGER trg_prevent_price_tampering
  BEFORE UPDATE OF estimated_price, total_price ON public.bookings
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

-- 4. Cross-User Read Protection & Booking Party Authorization
DROP POLICY IF EXISTS "View involved bookings" ON public.bookings;
CREATE POLICY "View involved bookings" ON public.bookings FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = provider_id OR public.is_admin());

DROP POLICY IF EXISTS "View booking messages" ON public.messages;
CREATE POLICY "View booking messages" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid() OR public.is_admin())
    )
  );

-- 5. Harden transition_booking_status authorization
CREATE OR REPLACE FUNCTION public.transition_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_expected_current_status TEXT,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  -- Lock row for update to eliminate race condition
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify caller authorization: must be customer, assigned provider, or admin
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> v_booking.customer_id
     AND (v_booking.provider_id IS NULL OR auth.uid() <> v_booking.provider_id)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a party to this booking' USING ERRCODE = '42501';
  END IF;

  IF v_booking.status <> p_expected_current_status THEN
    RAISE EXCEPTION 'Status conflict: expected "%" but current status is "%"',
      p_expected_current_status, v_booking.status
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.bookings
  SET
    status = p_new_status::booking_status,
    cancel_reason = COALESCE(p_cancel_reason, v_booking.cancel_reason),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN to_jsonb(v_booking);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
