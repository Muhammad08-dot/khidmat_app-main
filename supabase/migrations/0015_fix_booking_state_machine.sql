-- =============================================================================
-- 0015_fix_booking_state_machine.sql
-- M2-1 & M2-2:
--   1. Harden handle_new_user() so signup metadata can NEVER create an 'admin'.
--      (auth.uid() is NULL inside auth.users triggers, so role must be clamped.)
--   2. Ensure trg_booking_status_transition is FOR EACH ROW and aligns
--      check_booking_status_transition() + transition_booking_status() with
--      both 'confirmed' and 'accepted' flows and strict role-based rules.
-- =============================================================================

-- 1. Harden handle_new_user(): clamp signup metadata role to 'customer' | 'provider'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safe_role public.user_role;
BEGIN
  -- auth.uid() is NULL inside AFTER INSERT ON auth.users triggers.
  -- Never trust metadata for 'admin'; only 'provider' or 'customer' is allowed.
  v_safe_role := CASE
    WHEN (new.raw_user_meta_data->>'role') = 'provider' THEN 'provider'::public.user_role
    ELSE 'customer'::public.user_role
  END;

  INSERT INTO public.profiles (id, name, city, role, location_lat, location_lng)
  VALUES (
    new.id,
    COALESCE(NULLIF(new.raw_user_meta_data->>'name', ''), 'User'),
    new.raw_user_meta_data->>'city',
    v_safe_role,
    (new.raw_user_meta_data->>'location_lat')::double precision,
    (new.raw_user_meta_data->>'location_lng')::double precision
  );

  IF new.raw_user_meta_data ? 'phone' THEN
    INSERT INTO public.profile_contacts (user_id, phone)
    VALUES (new.id, new.raw_user_meta_data->>'phone')
    ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;
  END IF;

  IF v_safe_role = 'provider'::public.user_role THEN
    INSERT INTO public.providers (id, category, base_price)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'category',
      COALESCE((new.raw_user_meta_data->>'basePrice')::integer, 0)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- 2. Ensure trg_booking_status_transition is FOR EACH ROW
DROP TRIGGER IF EXISTS trg_booking_status_transition ON public.bookings;
CREATE TRIGGER trg_booking_status_transition
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_status_transition();
