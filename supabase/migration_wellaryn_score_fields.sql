-- =====================================================
-- Migration: Add Wellaryn Score fields to daily_metrics
-- Run this in Supabase SQL Editor
-- SAFE: Only touches web tables (daily_metrics, profiles)
-- Does NOT touch iOS tables
-- =====================================================

-- New columns for daily_metrics
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS energy INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS motivation INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS fatigue INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS pain_level INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS muscle_soreness INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS sleep_quality INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS recovery_score INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS modality_count INT DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS water_glasses INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS alcohol_drinks INT DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS late_caffeine BOOLEAN DEFAULT false;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS bedtime_minutes INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS wake_time_minutes INT;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS pain_areas TEXT[] DEFAULT '{}';

-- Add injury history flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_injury_history BOOLEAN DEFAULT false;

-- Update stress column: web previously used 0-100, now needs 1-10
-- We keep the column as-is (existing data will be handled in code)
-- New entries will use 1-10 scale
