-- Phase 2: Supabase Initialization for Khidmat App

-- 1. Create Enums
CREATE TYPE booking_status AS ENUM ('pending', 'matched', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled');
CREATE TYPE provider_tier AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum');
CREATE TYPE user_role AS ENUM ('customer', 'provider');

-- 2. Create Tables
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE providers (
  id UUID REFERENCES profiles(id) PRIMARY KEY,
  category TEXT REFERENCES categories(name),
  bio TEXT,
  base_price INTEGER DEFAULT 0,
  rating DOUBLE PRECISION DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  tier provider_tier DEFAULT 'Bronze',
  available BOOLEAN DEFAULT false,
  total_earnings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  provider_id UUID REFERENCES providers(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status booking_status DEFAULT 'pending',
  urgency TEXT DEFAULT 'medium',
  estimated_price INTEGER,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE provider_locations (
  provider_id UUID REFERENCES providers(id) PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) NOT NULL,
  provider_id UUID REFERENCES providers(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE push_tokens (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  token TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes for performance
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_messages_booking_time ON messages(booking_id, created_at);
CREATE INDEX idx_providers_category ON providers(category);

-- 4. Set up Auto-profile creation on Signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, city, role, location_lat, location_lng)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'customer'),
    (new.raw_user_meta_data->>'location_lat')::double precision,
    (new.raw_user_meta_data->>'location_lng')::double precision
  );

  -- If they signed up as a provider, create the provider row as well
  IF (new.raw_user_meta_data->>'role' = 'provider') THEN
    INSERT INTO public.providers (id, category, bio, base_price)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'category',
      new.raw_user_meta_data->>'bio',
      COALESCE((new.raw_user_meta_data->>'basePrice')::integer, 0)
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, only owner can update
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: Read-only for public
CREATE POLICY "Categories are viewable by everyone." ON categories FOR SELECT USING (true);

-- Providers: Anyone can read, only owner can update
CREATE POLICY "Providers are viewable by everyone." ON providers FOR SELECT USING (true);
CREATE POLICY "Providers can update own profile." ON providers FOR UPDATE USING (auth.uid() = id);

-- Bookings: Customers and Assigned Providers can view/update
CREATE POLICY "View involved bookings" ON bookings FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = provider_id);
CREATE POLICY "Create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Update involved bookings" ON bookings FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Messages: Only participants can view/insert
CREATE POLICY "View booking messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = messages.booking_id AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
  )
);
CREATE POLICY "Insert booking messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = messages.booking_id AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Provider Locations: Provider updates, customer reads
CREATE POLICY "Provider updates own location" ON provider_locations FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Customer reads provider location" ON provider_locations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = provider_locations.booking_id AND b.customer_id = auth.uid()
  )
);

-- Reviews: Anyone can read, author can insert
CREATE POLICY "Reviews viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Push tokens: User manages own tokens
CREATE POLICY "Manage own push tokens" ON push_tokens FOR ALL USING (auth.uid() = user_id);

-- 6. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
-- Phase 2.1: Bridge legacy Firestore-shaped screens onto Supabase
-- Adds: bookings.meta JSONB (extended screen fields), notifications table,
--       profiles.current_mode, extra booking statuses, public avatars bucket.

-- 1. Extra statuses used by the app UI
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'closed';

-- 2. Extended booking fields (timeSlot, address, workerLocation, travelFee, ...)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Worker/customer mode toggle used by profile & tab screens
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_mode TEXT NOT NULL DEFAULT 'customer';

-- Allow a user to self-register as a provider (upsert from the profile screen)
DROP POLICY IF EXISTS "Providers can create own row" ON providers;
CREATE POLICY "Providers can create own row" ON providers FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. In-app notifications (replaces the old Firestore `notifications` collection)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own notifications" ON notifications;
CREATE POLICY "View own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert notifications" ON notifications;
CREATE POLICY "Insert notifications" ON notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 5. Public avatars bucket + owner-only upload policy
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- Phase 3: Payments, KYC verification, job media, notification policy hardening

-- 1. Payments (COD by default; wallet rows created by server-side gateway later)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES profiles(id),
  method TEXT NOT NULL DEFAULT 'cod', -- 'cod' | 'jazzcash' | 'easypaisa' | 'card'
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View involved payments" ON payments;
CREATE POLICY "View involved payments" ON payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = payments.booking_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Insert involved payments" ON payments;
CREATE POLICY "Insert involved payments" ON payments FOR INSERT WITH CHECK (
  auth.uid() = payer_id AND
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = payments.booking_id
      AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- 2. Provider KYC / verification (C1: trust for in-home services)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'; -- 'unverified' | 'pending' | 'verified' | 'rejected'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- 3. Harden notifications INSERT (0002 shipped WITH CHECK (true); require an authenticated user)
DROP POLICY IF EXISTS "Insert notifications" ON notifications;
CREATE POLICY "Insert notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Job proof photos bucket (public read so both parties can see attachments)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job_media', 'job_media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload job media" ON storage.objects;
CREATE POLICY "Authenticated users can upload job media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'job_media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Job media is publicly readable" ON storage.objects;
CREATE POLICY "Job media is publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'job_media');

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
-- 0004: Enable free client-side cross-user push for chat messages.
--
-- push_tokens has a strict owner-only policy ("Manage own push tokens"),
-- which blocks one user from reading the recipient's Expo token needed to
-- fan out a "new message" push. This adds a narrowly-scoped SELECT policy:
-- a user may read the push tokens of anyone with whom they share a booking.
-- No new tables/columns — safe to apply with `npx supabase db push`.

CREATE POLICY "Booking partners can read push tokens"
ON push_tokens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
      AND (b.customer_id = push_tokens.user_id OR b.provider_id = push_tokens.user_id)
  )
);
-- 0005: Seen receipts for chat (free — no storage, one nullable column).
--
-- Adds a per-message read timestamp so the sender can show ✓ (delivered) vs
-- ✓✓ (seen). Recipients mark the partner's messages seen when they view the
-- thread, which needs an UPDATE policy for booking participants.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_messages_booking_seen ON messages(booking_id, seen_at);

-- Allow either party to mark messages in their own booking as seen.
CREATE POLICY "Participants can update booking messages" ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = messages.booking_id AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
  )
);
-- Phase 3.2: Saved addresses (address book on the profile)
-- A JSONB array of { id, label, line } entries per user, so the booking form
-- can offer a one-tap picker instead of retyping the address every time.
-- No storage cost — it lives in the existing profiles row (RLS: own row only).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS addresses JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Phase 5: Operational readiness for public launch.
-- Adds an `admin` role, a review-moderation flag, and the RLS an operations
-- back-office needs to vet providers and moderate reviews. Colour/data safe:
-- nothing here changes existing rows' behaviour for normal users.

-- 1. Admin role. `ALTER TYPE ... ADD VALUE` cannot be used in the same
--    transaction that *consumes* the new value; we only reference the literal
--    'admin' inside a function body (a string), never execute it here, so this
--    is safe to run in one migration transaction.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Review moderation flag (soft-hide; admins can still see hidden ones).
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- 3. SECURITY DEFINER helper so admin checks never recurse into profiles RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- 4. Admins may update any profile (e.g. flip verification_status) and any
--    provider row. Permissive policies OR with the existing owner-only ones.
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can moderate providers" ON public.providers;
CREATE POLICY "Admins can moderate providers" ON public.providers
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Reviews: admins can hide/unhide and delete; the public read now excludes
--    moderated (hidden) reviews while admins keep full visibility.
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews
  FOR SELECT USING (is_hidden = false OR public.is_admin());

DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.reviews;
CREATE POLICY "Admins can moderate reviews" ON public.reviews
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews" ON public.reviews
  FOR DELETE USING (public.is_admin());

-- 6. Index the verification queue (providers awaiting review).
CREATE INDEX IF NOT EXISTS idx_profiles_verification
  ON public.profiles (role, verification_status);
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

-- =============================================================================
-- 0012_user_reports.sql
-- User & Review Reporting & Moderation for platform safety
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL, -- 'provider', 'customer', 'review'
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Callers can insert their own reports
CREATE POLICY "Users can create reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can view and moderate all reports
CREATE POLICY "Admins can view all reports"
  ON public.user_reports FOR SELECT
  USING (public.is_admin() OR auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
  ON public.user_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.user_reports(reported_id);

-- Seed Categories
INSERT INTO categories (name, icon_name, base_price) VALUES
  ('Electrician', 'zap', 500),
  ('Plumber', 'droplet', 500),
  ('Carpenter', 'hammer', 600),
  ('Painter', 'paint-brush', 700),
  ('AC Technician', 'thermometer-snow', 800),
  ('House Cleaner', 'sparkles', 400),
  ('Appliance Repair', 'tool', 600),
  ('Mechanic', 'settings', 1000)
ON CONFLICT (name) DO NOTHING;

-- Note: We do not seed providers here automatically because providers are linked 
-- to auth.users (UUIDs) which don't exist yet in your fresh Supabase project. 
-- In Phase 3, we will use the app UI to create users and assign them provider roles!
