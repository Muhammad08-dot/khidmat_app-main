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
