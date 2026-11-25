-- =============================================================================
-- 0016_job_media_booking_rls.sql
-- Allows a booking's customer and provider to read objects in `job_media`
-- whose first folder is that `bookingId`, while preserving existing owner
-- and admin access.
-- =============================================================================

DROP POLICY IF EXISTS "Booking parties can read job media" ON storage.objects;
CREATE POLICY "Booking parties can read job media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job_media'
    AND auth.role() = 'authenticated'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
      )
    )
  );
