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

