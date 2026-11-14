-- =============================================================================
-- 0010_push_notifications_trigger.sql
-- Automatic notification & push triggers for KYC verification & Booking events
-- =============================================================================

-- 1. Trigger when provider verification status changes (KYC approval/rejection)
CREATE OR REPLACE FUNCTION public.handle_kyc_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    IF NEW.verification_status = 'verified' THEN
      INSERT INTO public.notifications (user_id, type, message)
      VALUES (
        NEW.id,
        'kyc',
        'Congratulations! Your Khidmat provider profile has been verified.'
      );
    ELSIF NEW.verification_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, message)
      VALUES (
        NEW.id,
        'kyc',
        'Your Khidmat provider verification was not approved. Please review your details and re-apply.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_kyc_status_change ON public.profiles;
CREATE TRIGGER trg_kyc_status_change
  AFTER UPDATE OF verification_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_kyc_status_change();

-- 2. Trigger on booking status changes to create notifications
CREATE OR REPLACE FUNCTION public.handle_booking_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_name TEXT;
  v_customer_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT name INTO v_provider_name FROM public.profiles WHERE id = NEW.provider_id;
    SELECT name INTO v_customer_name FROM public.profiles WHERE id = NEW.customer_id;

    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.notifications (user_id, type, message, booking_id)
      VALUES (
        NEW.customer_id,
        'job_accepted',
        COALESCE(v_provider_name, 'Your provider') || ' accepted your booking request.',
        NEW.id
      );
    ELSIF NEW.status = 'in_progress' THEN
      INSERT INTO public.notifications (user_id, type, message, booking_id)
      VALUES (
        NEW.customer_id,
        'job_confirmed',
        COALESCE(v_provider_name, 'Your provider') || ' started working on your service.',
        NEW.id
      );
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, type, message, booking_id)
      VALUES (
        NEW.customer_id,
        'job_completed',
        COALESCE(v_provider_name, 'Your provider') || ' completed the job. Please review and rate the service.',
        NEW.id
      );
    ELSIF NEW.status = 'cancelled' THEN
      -- Notify both parties
      INSERT INTO public.notifications (user_id, type, message, booking_id)
      VALUES
        (NEW.customer_id, 'job_confirmed', 'Booking was cancelled.', NEW.id),
        (NEW.provider_id, 'job_confirmed', 'Booking was cancelled.', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_notification ON public.bookings;
CREATE TRIGGER trg_booking_status_notification
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_status_notification();

