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
