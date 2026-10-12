-- =============================================================================
-- 0008_security_hardening.sql
-- P0 / P1 security pass for Play Store launch:
--   1. Split phone into profile_contacts (self / admin / booking-counterparty only)
--   2. Scope notifications INSERT so authenticated users cannot forge inboxes
--   3. Lock job_media bucket to private + owner-or-admin reads
--   4. Add admin_actions audit trail for every moderation mutation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PII split: profiles.phone -> profile_contacts.phone
--    Row-level RLS in Postgres cannot mask a column; the correct primitive is
--    a separate table with tight access. Public browse paths keep reading
--    profiles (name/city/photo_url/role/etc) unchanged.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_contacts (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone   TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

-- A caller may read a contact row only when they are:
--   (a) the owner of the row,
--   (b) a platform admin, or
--   (c) a party on a booking that shares them with the target user.
CREATE POLICY "Contacts visible to owner, admin, or booking counterparties"
  ON public.profile_contacts FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.customer_id = auth.uid() AND b.provider_id = profile_contacts.user_id)
         OR (b.provider_id  = auth.uid() AND b.customer_id = profile_contacts.user_id)
    )
  );

CREATE POLICY "Owner can upsert own contact"
  ON public.profile_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Owner can update own contact"
  ON public.profile_contacts FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_profile_contacts_user ON public.profile_contacts(user_id);

-- Backfill existing phone values, then drop the public column.
INSERT INTO public.profile_contacts (user_id, phone)
  SELECT id, phone FROM public.profiles
  WHERE phone IS NOT NULL AND phone <> ''
ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

-- Re-point the signup trigger: profiles row no longer stores phone, so we
-- insert contact into profile_contacts alongside.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, city, role, location_lat, location_lng)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'city',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'customer'),
    (new.raw_user_meta_data->>'location_lat')::double precision,
    (new.raw_user_meta_data->>'location_lng')::double precision
  );

  IF new.raw_user_meta_data ? 'phone' THEN
    INSERT INTO public.profile_contacts (user_id, phone)
    VALUES (new.id, new.raw_user_meta_data->>'phone')
    ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;
  END IF;

  IF (new.raw_user_meta_data->>'role' = 'provider') THEN
    INSERT INTO public.providers (id, category, base_price)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'category',
      COALESCE((new.raw_user_meta_data->>'basePrice')::integer, 0)
    );
  END IF;

  RETURN new;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. Notifications: forge-proof INSERT.
--    0003 shipped "WITH CHECK (auth.uid() IS NOT NULL)" — any authenticated
--    user could create a notification for any other user_id (phishing /
--    spam). Now: only self, admins, or a booking counterparty on a notification
--    that references a booking they share.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
    OR (
      booking_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = notifications.booking_id
          AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Job-media bucket: private + owner/admin reads.
--    The photo-attachment feature is currently disabled by product decision,
--    but the bucket + policies exist and 0003 made it public. Revoke public
--    read so any future object uploaded there isn't world-readable by URL.
-- -----------------------------------------------------------------------------

UPDATE storage.buckets SET public = false WHERE id = 'job_media';

DROP POLICY IF EXISTS "Job media is publicly readable" ON storage.objects;
CREATE POLICY "Job media readable by owner or admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job_media'
    AND (
      (auth.uid()::text = (storage.foldername(name))[1])
      OR public.is_admin()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Admin audit trail: who approved / rejected / hid / deleted what and when.
--    RLS: admins can read; only admins (with actor_id = caller) can insert.
--    No UPDATE / DELETE policies -> the log is append-only.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,   -- e.g. 'provider.verified' | 'review.hidden'
  target_type TEXT NOT NULL,   -- 'profile' | 'review'
  target_id   UUID NOT NULL,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_actor   ON public.admin_actions(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target  ON public.admin_actions(target_type, target_id);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read the audit log" ON public.admin_actions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins append to the audit log" ON public.admin_actions
  FOR INSERT WITH CHECK (actor_id = auth.uid() AND public.is_admin());
