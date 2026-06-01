-- =====================================================
-- Fix: Add missing UPDATE policies for upsert operations
-- Run this in Supabase SQL Editor
-- =====================================================

-- readiness_scores needs UPDATE for upsert (only has SELECT + INSERT)
CREATE POLICY "Users can update own scores"
    ON readiness_scores FOR UPDATE
    USING (auth.uid() = user_id);

-- baselines needs UPDATE for upsert
CREATE POLICY "baselines_update"
    ON baselines FOR UPDATE
    USING (auth.uid() = user_id);

-- Also grant permissions to authenticated users (needed because auto-expose is off)
GRANT SELECT, INSERT, UPDATE ON public.daily_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.readiness_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.baselines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.weekly_checkins TO authenticated;
GRANT SELECT, INSERT ON public.injury_reports TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT SELECT ON public.invitation_codes TO anon, authenticated;
GRANT UPDATE ON public.invitation_codes TO authenticated;
