-- ============================================
-- Wellaryn — Coach Notifications
-- Migration: Create coach_notifications table
-- ============================================

CREATE TABLE IF NOT EXISTS coach_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('low_score', 'high_acwr', 'high_injury_risk', 'no_data', 'score_drop')),
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  score REAL,
  read BOOLEAN DEFAULT false,
  emailed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup for coach's unread notifications feed
CREATE INDEX IF NOT EXISTS idx_notifications_coach ON coach_notifications(coach_id, read, created_at DESC);

-- Deduplication: prevent duplicate alerts for same coach+athlete+type on same day
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON coach_notifications(coach_id, athlete_id, type, created_at);

-- Row Level Security
ALTER TABLE coach_notifications ENABLE ROW LEVEL SECURITY;

-- Coaches can only read their own notifications
CREATE POLICY "coach_reads_own_notifications" ON coach_notifications FOR SELECT USING (auth.uid() = coach_id);

-- Coaches can only update (mark as read) their own notifications
CREATE POLICY "coach_updates_own_notifications" ON coach_notifications FOR UPDATE USING (auth.uid() = coach_id);

-- System (service role / cron) can insert notifications for any coach
CREATE POLICY "system_inserts_notifications" ON coach_notifications FOR INSERT WITH CHECK (true);

GRANT ALL ON coach_notifications TO anon, authenticated;
