-- =============================================================================
-- 0014_rls_hardening.sql
-- Task P3-4: Anti-role escalation, immutable admin_actions audit log,
-- price-lock after booking confirmation, cross-user read protections,
-- and authorized booking transitions with role-based rules.
-- Fully idempotent migration.
-- =============================================================================

-- 1. Anti-Self-Escalation on profiles.role (covers INSERT and UPDATE)
--    Allows normal customer <-> provider selection (signup, complete-profile),
--    while blocking any non-admin from setting or keeping role = 'admin'.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF NEW.role = 'admin' THEN
    -- Admin bootstrap path: allow only direct SQL/seed (auth.uid() IS NULL),
    -- service_role, or an existing admin user.
    IF auth.uid() IS NOT NULL
       AND v_jwt_role <> 'service_role'
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only platform administrators can assign or retain the admin role.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 2. Price lock after acceptance vs completion
--    Once a booking moves beyond 'pending', estimated_price is locked forever.
--    total_price can be finalized once during completion (if previously NULL),
--    but once set, cannot be altered by non-admins.
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
--    Prevent any modification or deletion of past administrative audit logs.
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

-- 4. Cross-User Read Protection & Open Pending Requests in Provider's City
DROP POLICY IF EXISTS "View involved bookings" ON public.bookings;
CREATE POLICY "View involved bookings" ON public.bookings FOR SELECT
  USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.is_admin()
    OR (
      status = 'pending'
      AND provider_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.providers pr
        JOIN public.profiles pf_prov ON pf_prov.id = pr.id
        JOIN public.profiles pf_cust ON pf_cust.id = bookings.customer_id
        WHERE pr.id = auth.uid()
          AND (pf_prov.city IS NULL OR pf_cust.city IS NULL OR pf_prov.city = pf_cust.city)
      )
    )
  );

DROP POLICY IF EXISTS "View booking messages" ON public.messages;
CREATE POLICY "View booking messages" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid() OR public.is_admin())
    )
  );

-- 5. Keep 0009 booking state-machine trigger aligned with accepted/on_the_way/confirmed
CREATE OR REPLACE FUNCTION public.check_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status::text IN ('accepted', 'confirmed', 'rejected', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status::text IN ('accepted', 'confirmed') AND NEW.status::text IN ('on_the_way', 'in_progress', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'on_the_way' AND NEW.status::text IN ('in_progress', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    RETURN NEW;
  ELSIF OLD.status = 'completed' AND NEW.status::text IN ('reviewed', 'closed') THEN
    RETURN NEW;
  ELSIF OLD.status::text = 'reviewed' AND NEW.status::text = 'closed' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid booking status transition from "%" to "%"', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Harden transition_booking_status (signature identical to 0009)
--    Restores every 0009 transition validation and enforces role-based rules:
--      - provider: pending -> accepted/confirmed/rejected, accepted/confirmed -> in_progress/on_the_way, in_progress -> completed
--      - customer: cancel while pending/accepted/confirmed (or review/close after completion); CANNOT accept/start/complete
--      - admin / service_role / direct SQL: any valid transition
CREATE OR REPLACE FUNCTION public.transition_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_expected_current_status TEXT,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking     public.bookings%ROWTYPE;
  v_caller      UUID := auth.uid();
  v_is_admin    BOOLEAN := public.is_admin();
  v_is_customer BOOLEAN;
  v_is_provider BOOLEAN;
  v_valid_move  BOOLEAN := FALSE;
BEGIN
  -- Lock row for update to eliminate race condition
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify expected current status (optimistic concurrency check)
  IF v_booking.status::text <> p_expected_current_status THEN
    RAISE EXCEPTION 'Status conflict: expected "%" but current status is "%"',
      p_expected_current_status, v_booking.status
      USING ERRCODE = '23514';
  END IF;

  -- Validate state machine transition (0009 rules + accepted/on_the_way)
  v_valid_move :=
    (v_booking.status = 'pending' AND p_new_status IN ('accepted', 'confirmed', 'rejected', 'cancelled'))
    OR (v_booking.status::text IN ('accepted', 'confirmed') AND p_new_status IN ('on_the_way', 'in_progress', 'cancelled'))
    OR (v_booking.status = 'on_the_way' AND p_new_status IN ('in_progress', 'cancelled'))
    OR (v_booking.status = 'in_progress' AND p_new_status = 'completed')
    OR (v_booking.status = 'completed' AND p_new_status IN ('reviewed', 'closed'))
    OR (v_booking.status::text = 'reviewed' AND p_new_status = 'closed');

  IF NOT v_valid_move THEN
    RAISE EXCEPTION 'Invalid booking status transition from "%" to "%"', v_booking.status, p_new_status
      USING ERRCODE = '22023';
  END IF;

  -- Role-based authorization rules for authenticated non-admin callers
  IF v_caller IS NOT NULL AND NOT v_is_admin THEN
    v_is_customer := (v_caller = v_booking.customer_id);
    v_is_provider := (v_booking.provider_id IS NOT NULL AND v_caller = v_booking.provider_id);

    IF NOT v_is_customer AND NOT v_is_provider THEN
      RAISE EXCEPTION 'Unauthorized: Caller is not a party to this booking' USING ERRCODE = '42501';
    END IF;

    -- Customer-only caller: may cancel while pending/accepted/confirmed (or review/close),
    -- must NOT accept, start, or complete.
    IF v_is_customer AND NOT v_is_provider THEN
      IF NOT (
        (p_new_status = 'cancelled' AND v_booking.status::text IN ('pending', 'accepted', 'confirmed'))
        OR (p_new_status IN ('reviewed', 'closed') AND v_booking.status::text IN ('completed', 'reviewed'))
      ) THEN
        RAISE EXCEPTION 'Unauthorized: Customers cannot transition booking to "%"', p_new_status
          USING ERRCODE = '42501';
      END IF;
    END IF;
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
$$;
