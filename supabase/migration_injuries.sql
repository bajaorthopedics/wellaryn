CREATE TABLE IF NOT EXISTS injury_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g., 'Left knee sprain'
  body_part TEXT NOT NULL, -- e.g., 'knee_left', 'shoulder_right', 'back_lower'
  injury_type TEXT NOT NULL CHECK (injury_type IN ('acute', 'chronic', 'overuse', 'surgical', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  description TEXT,
  injury_date DATE DEFAULT CURRENT_DATE,
  expected_recovery_date DATE,
  actual_recovery_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'recovering', 'cleared', 'recurring')),
  rtp_phase TEXT DEFAULT 'rest' CHECK (rtp_phase IN ('rest', 'rehab', 'modified_training', 'full_training', 'competition', 'cleared')),
  rtp_criteria TEXT, -- JSON string with return-to-play checklist
  created_by UUID REFERENCES auth.users(id), -- athlete, coach, or doctor
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS injury_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  injury_id UUID NOT NULL REFERENCES injury_log(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('note', 'phase_change', 'severity_change', 'status_change')),
  previous_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_injury_user ON injury_log(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_injury_updates ON injury_updates(injury_id, created_at DESC);

ALTER TABLE injury_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE injury_updates ENABLE ROW LEVEL SECURITY;

-- User manages own injuries
CREATE POLICY "user_manages_injuries" ON injury_log
  FOR ALL USING (auth.uid() = user_id);

-- Coach/doctor can view and manage athlete injuries
CREATE POLICY "coach_manages_athlete_injuries" ON injury_log
  FOR ALL USING (
    user_id IN (
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = auth.uid() AND status = 'accepted'
    )
  );

-- Same for updates
CREATE POLICY "user_reads_own_updates" ON injury_updates
  FOR SELECT USING (
    injury_id IN (SELECT id FROM injury_log WHERE user_id = auth.uid())
  );
CREATE POLICY "coach_reads_athlete_updates" ON injury_updates
  FOR SELECT USING (
    injury_id IN (
      SELECT id FROM injury_log WHERE user_id IN (
        SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid() AND status = 'accepted'
      )
    )
  );
CREATE POLICY "author_inserts_updates" ON injury_updates
  FOR INSERT WITH CHECK (auth.uid() = author_id);

GRANT ALL ON injury_log TO anon, authenticated;
GRANT ALL ON injury_updates TO anon, authenticated;
