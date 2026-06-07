CREATE TABLE IF NOT EXISTS athlete_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('performance', 'recovery', 'sleep', 'training', 'weight', 'custom')),
  metric TEXT, -- e.g., 'wellaryn_score', 'hrv', 'sleep_hours', 'training_load', 'weight'
  target_value REAL,
  current_value REAL,
  unit TEXT, -- e.g., 'ms', 'bpm', 'hours', 'kg', 'points'
  start_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  progress REAL DEFAULT 0, -- 0-100 percentage
  created_by UUID REFERENCES auth.users(id), -- athlete or coach who created it
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON athlete_goals(user_id, status, created_at DESC);

ALTER TABLE athlete_goals ENABLE ROW LEVEL SECURITY;

-- User can CRUD their own goals
CREATE POLICY "user_manages_own_goals" ON athlete_goals
  FOR ALL USING (auth.uid() = user_id);

-- Coach/doctor can view and create goals for their athletes
CREATE POLICY "coach_manages_athlete_goals" ON athlete_goals
  FOR ALL USING (
    user_id IN (
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = auth.uid() AND status = 'accepted'
    )
  );

GRANT ALL ON athlete_goals TO anon, authenticated;
