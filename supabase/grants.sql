-- =====================================================
-- Wellaryn — API Access Grants
-- Run this AFTER migration.sql in Supabase SQL Editor
-- 
-- Because "Automatically expose new tables" is OFF,
-- we need to explicitly grant access to each table.
-- RLS policies still control WHO can see WHAT rows.
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- PROFILES: authenticated users only
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- DAILY METRICS: authenticated users only
GRANT SELECT, INSERT, UPDATE ON public.daily_metrics TO authenticated;

-- BASELINES: authenticated users only
GRANT SELECT, INSERT, UPDATE ON public.baselines TO authenticated;

-- READINESS SCORES: authenticated users only
GRANT SELECT, INSERT ON public.readiness_scores TO authenticated;

-- WEEKLY CHECKINS: authenticated users only
GRANT SELECT, INSERT ON public.weekly_checkins TO authenticated;

-- INJURY REPORTS: authenticated users only
GRANT SELECT, INSERT ON public.injury_reports TO authenticated;

-- INVITATION CODES: anon can read (to validate during registration)
GRANT SELECT ON public.invitation_codes TO anon, authenticated;
-- Only authenticated can update (increment uses)
GRANT UPDATE ON public.invitation_codes TO authenticated;

-- Grant sequence usage (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- DONE — All tables are now accessible via the API
-- but RLS policies still enforce per-user isolation
-- =====================================================
