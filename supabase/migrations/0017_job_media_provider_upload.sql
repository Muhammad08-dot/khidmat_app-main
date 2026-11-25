-- =============================================================================
-- 0017_job_media_provider_upload.sql
-- Restricts `job_media` INSERT and DELETE to the booking's assigned provider
-- (or admin) under `{bookingId}/...`, replacing 0003's wide-open INSERT policy.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload job media" ON storage.objects;
DROP POLICY IF EXISTS "Booking provider can upload job media" ON storage.objects;
CREATE POLICY "Booking provider can upload job media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job_media'
    AND auth.role() = 'authenticated'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.provider_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Booking provider can delete own job media" ON storage.objects;
CREATE POLICY "Booking provider can delete own job media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'job_media'
    AND auth.role() = 'authenticated'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.provider_id = auth.uid()
      )
    )
  );
