-- =============================================================================
-- 0009_booking_state_machine.sql
-- Enforces valid booking status lifecycle transitions & prevents race conditions
--
-- Allowed state transitions:
--   pending     -> confirmed, rejected, cancelled
--   confirmed   -> in_progress, cancelled
--   in_progress -> completed
--   completed   -> reviewed, closed
--   reviewed    -> closed
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE OR REPLACE FUNCTION public.check_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is not changing, allow update (e.g. metadata/notes/coords updates)
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate state machine transitions
  IF OLD.status = 'pending' AND NEW.status IN ('confirmed', 'rejected', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'confirmed' AND NEW.status IN ('in_progress', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    RETURN NEW;
  ELSIF OLD.status = 'completed' AND NEW.status IN ('reviewed', 'closed') THEN
    RETURN NEW;
  ELSIF OLD.status = 'reviewed' AND NEW.status = 'closed' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid booking status transition from "%" to "%"', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_status_transition ON public.bookings;
CREATE TRIGGER trg_booking_status_transition
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_status_transition();

-- Atomic RPC function for transitioning booking status safely
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

  IF v_booking.status <> p_expected_current_status THEN
    RAISE EXCEPTION 'Status conflict: expected "%" but current status is "%"',
      p_expected_current_status, v_booking.status
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.bookings
  SET
    status = p_new_status,
    cancel_reason = COALESCE(p_cancel_reason, v_booking.cancel_reason),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN to_jsonb(v_booking);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
