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
