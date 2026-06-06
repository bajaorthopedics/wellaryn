-- ═══════════════════════════════════════════════════════════════
-- Coach/Doctor ↔ Athlete Relationships
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coach_athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_role TEXT NOT NULL CHECK (coach_role IN ('coach', 'doctor')),
  invite_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  -- Each athlete can have at most 1 coach and 1 doctor
  UNIQUE (athlete_id, coach_role),
  -- Each coach-athlete pair is unique
  UNIQUE (coach_id, athlete_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_coach_athletes_coach ON coach_athletes(coach_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_coach_athletes_athlete ON coach_athletes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_invite ON coach_athletes(invite_code) WHERE status = 'pending';

-- ─── RLS Policies ──────────────────────────────────────────────

ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;

-- Coach/doctor can see their own athlete relationships
CREATE POLICY "coach_sees_own_athletes" ON coach_athletes
  FOR SELECT USING (auth.uid() = coach_id);

-- Athlete can see who monitors them
CREATE POLICY "athlete_sees_own_coaches" ON coach_athletes
  FOR SELECT USING (auth.uid() = athlete_id);

-- Anyone can look up a pending invite by code (for accept flow)
CREATE POLICY "anyone_reads_pending_invite" ON coach_athletes
  FOR SELECT USING (status = 'pending' AND invite_code IS NOT NULL);

-- Coach/doctor can create invitations
CREATE POLICY "coach_can_invite" ON coach_athletes
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- Athlete can accept/reject invitation
CREATE POLICY "athlete_can_respond" ON coach_athletes
  FOR UPDATE USING (auth.uid() = athlete_id AND status = 'pending');

-- Coach can remove relationship
CREATE POLICY "coach_can_remove" ON coach_athletes
  FOR DELETE USING (auth.uid() = coach_id);

-- Athlete can remove relationship
CREATE POLICY "athlete_can_remove" ON coach_athletes
  FOR DELETE USING (auth.uid() = athlete_id);

-- ─── Cross-user data access for coaches/doctors ────────────────

-- Drop existing restrictive policies and replace with coach-aware ones
-- NOTE: Run these in Supabase SQL Editor. If policies don't exist, ignore errors.

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own metrics" ON daily_metrics;
  DROP POLICY IF EXISTS "Users can view own scores" ON readiness_scores;
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- daily_metrics: user sees own + coach sees athlete's
CREATE POLICY "user_or_coach_reads_metrics" ON daily_metrics
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = auth.uid() AND status = 'accepted'
    )
  );

-- Ensure user can still insert/update their own metrics
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own metrics" ON daily_metrics;
  DROP POLICY IF EXISTS "Users can update own metrics" ON daily_metrics;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "user_inserts_own_metrics" ON daily_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_updates_own_metrics" ON daily_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- readiness_scores: user sees own + coach sees athlete's
CREATE POLICY "user_or_coach_reads_scores" ON readiness_scores
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = auth.uid() AND status = 'accepted'
    )
  );

-- profiles: user sees own + coach sees athlete's
CREATE POLICY "user_or_coach_reads_profile" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR id IN (
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = auth.uid() AND status = 'accepted'
    )
  );

-- ─── GRANTs ────────────────────────────────────────────────────

GRANT ALL ON coach_athletes TO anon, authenticated;
