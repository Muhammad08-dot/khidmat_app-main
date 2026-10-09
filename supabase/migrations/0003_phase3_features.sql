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
