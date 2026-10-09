-- Phase 3.2: Saved addresses (address book on the profile)
-- A JSONB array of { id, label, line } entries per user, so the booking form
-- can offer a one-tap picker instead of retyping the address every time.
-- No storage cost — it lives in the existing profiles row (RLS: own row only).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS addresses JSONB NOT NULL DEFAULT '[]'::jsonb;
