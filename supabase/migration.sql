-- =====================================================
-- Wellaryn Database Schema — Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    sport TEXT DEFAULT 'running',
    role TEXT DEFAULT 'athlete' CHECK (role IN ('athlete', 'coach', 'doctor', 'admin')),
    age INT,
    weight REAL,           -- kg
    height REAL,           -- cm
    sleep_need REAL DEFAULT 8.0, -- hours
    
    -- Beta / Invitation
    invitation_code TEXT,
    invited_by UUID REFERENCES profiles(id),
    
    -- Consent tracking
    health_data_consent BOOLEAN DEFAULT FALSE,
    health_data_consent_at TIMESTAMPTZ,
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    privacy_accepted BOOLEAN DEFAULT FALSE,
    privacy_accepted_at TIMESTAMPTZ,
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only see/edit their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 2. DAILY METRICS (biometric time-series)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- HRV
    hrv_rmssd REAL,           -- ms
    
    -- Heart Rate
    rhr INT,                   -- bpm (resting)
    
    -- Sleep
    sleep_total REAL,          -- hours
    sleep_deep REAL,           -- hours
    sleep_rem REAL,            -- hours
    sleep_light REAL,          -- hours
    sleep_efficiency REAL,     -- 0-1
    
    -- Training (session-RPE)
    training_load REAL,        -- RPE × minutes (arbitrary units)
    training_rpe INT,          -- 1-10
    training_duration INT,     -- minutes
    training_type TEXT,        -- 'run', 'crossfit', 'padel', etc.
    
    -- Subjective (optional)
    stress INT,                -- 0-100
    mood INT,                  -- 1-10
    
    -- Activity
    steps INT,
    calories INT,
    
    -- Data source
    source TEXT DEFAULT 'manual', -- 'manual', 'oura', 'whoop', 'apple_health'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- RLS: Users can only access their own metrics
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
    ON daily_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
    ON daily_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
    ON daily_metrics FOR UPDATE
    USING (auth.uid() = user_id);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date
    ON daily_metrics(user_id, date DESC);

-- =====================================================
-- 3. BASELINES (personal rolling averages)
-- =====================================================
CREATE TABLE IF NOT EXISTS baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    metric TEXT NOT NULL CHECK (metric IN ('hrv', 'rhr', 'sleep')),
    
    mean REAL NOT NULL,
    std_dev REAL NOT NULL,
    ln_mean REAL,              -- For HRV log-transform
    ln_std REAL,               -- For HRV log-transform
    window_days INT NOT NULL,  -- 60 for HRV, 30 for RHR
    sample_count INT NOT NULL,
    confidence TEXT DEFAULT 'calibrating' CHECK (confidence IN ('complete', 'low', 'calibrating', 'none')),
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, metric)
);

ALTER TABLE baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own baselines"
    ON baselines FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own baselines"
    ON baselines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baselines"
    ON baselines FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- 4. READINESS SCORES (audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS readiness_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    band TEXT NOT NULL CHECK (band IN ('ready', 'moderate', 'low', 'risk')),
    zone TEXT NOT NULL,
    
    -- Sub-scores for audit
    hrv_score INT,
    sleep_score INT,
    acwr_score INT,
    rhr_score INT,
    
    -- ACWR details
    acwr_value REAL,
    acute_load REAL,
    chronic_load REAL,
    
    -- Modifiers
    modifier_stress REAL,
    
    -- Confidence
    confidence TEXT DEFAULT 'calibrating',
    
    -- Weakest component
    weakest_component TEXT,
    
    -- Recommendations (JSONB for flexibility)
    recommendations JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

ALTER TABLE readiness_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores"
    ON readiness_scores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scores"
    ON readiness_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_readiness_scores_user_date
    ON readiness_scores(user_id, date DESC);

-- =====================================================
-- 5. PILOT: WEEKLY CHECK-INS
-- =====================================================
CREATE TABLE IF NOT EXISTS weekly_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    
    pain_level INT CHECK (pain_level >= 0 AND pain_level <= 10),
    pain_zone TEXT,            -- 'knee', 'ankle', 'hip', 'shoulder', etc.
    pain_description TEXT,
    trained_this_week BOOLEAN DEFAULT TRUE,
    days_trained INT,
    general_fatigue INT CHECK (general_fatigue >= 0 AND general_fatigue <= 10),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
    ON weekly_checkins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
    ON weekly_checkins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. PILOT: INJURY/OVERLOAD REPORTS
-- =====================================================
CREATE TABLE IF NOT EXISTS injury_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    type TEXT CHECK (type IN ('injury', 'overload', 'pain', 'other')),
    zone TEXT NOT NULL,        -- 'left_knee', 'right_ankle', etc.
    severity INT CHECK (severity >= 1 AND severity <= 5),
    description TEXT,
    days_missed INT DEFAULT 0,
    medical_attention BOOLEAN DEFAULT FALSE,
    
    -- Context at time of report
    readiness_score_at_time INT,
    acwr_at_time REAL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE injury_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own injuries"
    ON injury_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own injuries"
    ON injury_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. INVITATION CODES (beta program)
-- =====================================================
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES profiles(id),
    max_uses INT DEFAULT 10,
    current_uses INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    sport TEXT DEFAULT 'running',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anyone to read invitation codes (for validation)
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can validate invitation codes"
    ON invitation_codes FOR SELECT
    USING (true);

-- Insert a default beta code
INSERT INTO invitation_codes (code, max_uses, sport)
VALUES ('WELLARYN-BETA-2026', 50, 'running')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- DONE
-- =====================================================
