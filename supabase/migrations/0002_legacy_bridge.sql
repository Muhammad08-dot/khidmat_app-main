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
