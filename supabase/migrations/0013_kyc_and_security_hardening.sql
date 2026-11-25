-- =============================================================================
-- 0013_kyc_and_security_hardening.sql
-- Task P3-3: Private KYC bucket, owner-only access, admin audit, signed URLs,
-- and safe account deletion with full booking PII anonymization.
-- Fully idempotent migration.
-- =============================================================================

-- 1. Ensure private KYC storage bucket exists with public access disabled
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760, -- 10MB limit per document
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Storage Policies for kyc-documents (Owner upload/read, Admin read/audit)
DROP POLICY IF EXISTS "Owner can upload KYC documents" ON storage.objects;
CREATE POLICY "Owner can upload KYC documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner and admin can read KYC documents" ON storage.objects;
CREATE POLICY "Owner and admin can read KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND
    auth.role() = 'authenticated' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Owner can update own KYC documents" ON storage.objects;
CREATE POLICY "Owner can update own KYC documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'kyc-documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner or admin can delete KYC documents" ON storage.objects;
CREATE POLICY "Owner or admin can delete KYC documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kyc-documents' AND
    auth.role() = 'authenticated' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- 3. Make admin_actions compatible with immutable audit logging and account deletion:
--    0008 created actor_id NOT NULL REFERENCES profiles(id) ON DELETE CASCADE.
--    With 0014's append-only immutability trigger on admin_actions, ON DELETE CASCADE
--    would abort profile deletion, and inserting after profile deletion would fail FK.
--    Allow NULL actor_id (for self-deleted users) and drop ON DELETE CASCADE.
ALTER TABLE public.admin_actions
  ALTER COLUMN actor_id DROP NOT NULL;

ALTER TABLE public.admin_actions
  DROP CONSTRAINT IF EXISTS admin_actions_actor_id_fkey;

-- 4. Enhance delete_user_account() (signature identical to 0011)
-- NOTE on Storage Tables: Raw SQL DELETE on storage.objects is avoided to protect
-- internal Supabase Storage metadata and S3 sync. Storage files (kyc-documents,
-- avatars, job_media) are purged via the Storage API in accountDeletion.ts before
-- calling this RPC, and auth.users is deleted via the delete-account Edge Function.
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_actor  UUID;
BEGIN
  -- Security check: callers can only delete their own account unless admin or service_role
  IF v_caller IS NOT NULL AND v_caller <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized to delete this account' USING ERRCODE = '42501';
  END IF;

  -- Record audit actor only if caller is a different surviving admin
  v_actor := CASE WHEN v_caller IS NOT NULL AND v_caller <> p_user_id THEN v_caller ELSE NULL END;

  -- 1. Remove push tokens
  DELETE FROM public.push_tokens WHERE user_id = p_user_id;

  -- 2. Remove notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;

  -- 3. Remove contact info
  DELETE FROM public.profile_contacts WHERE user_id = p_user_id;

  -- 4. Anonymize past booking PII (description, coordinates, and meta PII keys)
  UPDATE public.bookings
  SET
    description = '[Deleted User Booking]',
    location_lat = NULL,
    location_lng = NULL,
    meta = COALESCE(meta, '{}'::jsonb)
      - 'address'
      - 'notes'
      - 'coordinates'
      - 'clientLocation'
      - 'workerLocation'
      - 'customerName'
      - 'customerPhone'
  WHERE customer_id = p_user_id OR provider_id = p_user_id;

  -- 5. Audit log the deletion BEFORE deleting the profile (using 0008 schema: actor_id, target_id UUID, meta)
  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, meta)
  VALUES (
    v_actor,
    'account.deleted',
    'profile',
    p_user_id,
    jsonb_build_object(
      'deleted_user_id', p_user_id,
      'self_deleted', (v_caller IS NULL OR v_caller = p_user_id),
      'timestamp', timezone('utc'::text, now())
    )
  );

  -- 6. Delete provider record if applicable
  DELETE FROM public.providers WHERE id = p_user_id;

  -- 7. Delete user profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;
