-- =============================================================================
-- 0011_account_deletion.sql
-- In-app account deletion for Google Play compliance
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Security check: callers can only delete their own account unless admin
  IF auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized to delete this account' USING ERRCODE = '42501';
  END IF;

  -- 1. Remove push tokens
  DELETE FROM public.push_tokens WHERE user_id = p_user_id;

  -- 2. Remove notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;

  -- 3. Remove contact info
  DELETE FROM public.profile_contacts WHERE user_id = p_user_id;

  -- 4. Anonymize past booking history so financial ledgers remain consistent
  UPDATE public.bookings
  SET description = '[Deleted User Booking]'
  WHERE customer_id = p_user_id OR provider_id = p_user_id;

  -- 5. Delete provider record if applicable
  DELETE FROM public.providers WHERE id = p_user_id;

  -- 6. Anonymize/delete user profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- 7. Audit log the deletion
  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, details)
  VALUES (
    COALESCE(auth.uid(), p_user_id),
    'account.deleted',
    'profile',
    p_user_id::text,
    jsonb_build_object('user_id', p_user_id, 'timestamp', timezone('utc'::text, now()))
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
