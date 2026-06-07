-- Wellaryn Subscription Migration
-- Adds Stripe subscription fields to profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_interval TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
