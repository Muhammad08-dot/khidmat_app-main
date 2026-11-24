-- =============================================================================
-- 0013_kyc_and_security_hardening.sql
-- Task P3-3: Private KYC bucket, owner-only access, admin audit, signed URLs,
-- and cascade account deletion for KYC documents.
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

-- 3. Enhance delete_user_account() to cascade deletion to KYC storage objects
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Security check: callers can only delete their own account unless admin
  IF auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized to delete this account' USING ERRCODE = '42501';
  END IF;

  -- 1. Remove KYC documents from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = p_user_id::text;

  -- 2. Remove push tokens
  DELETE FROM public.push_tokens WHERE user_id = p_user_id;

  -- 3. Remove notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;

  -- 4. Remove contact info
  DELETE FROM public.profile_contacts WHERE user_id = p_user_id;

  -- 5. Anonymize past booking history so financial ledgers remain consistent
  UPDATE public.bookings
  SET description = '[Deleted User Booking]'
  WHERE customer_id = p_user_id OR provider_id = p_user_id;

  -- 6. Delete provider record if applicable
  DELETE FROM public.providers WHERE id = p_user_id;

  -- 7. Anonymize/delete user profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- 8. Audit log the deletion
  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, details)
  VALUES (
    COALESCE(auth.uid(), p_user_id),
    'account.deleted',
    'profile',
    p_user_id::text,
    jsonb_build_object(
      'user_id', p_user_id,
      'kyc_purged', true,
      'timestamp', timezone('utc'::text, now())
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

