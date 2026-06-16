-- Early access email signups from landing page
CREATE TABLE IF NOT EXISTS early_access_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anonymous inserts (landing page visitors aren't authenticated)
ALTER TABLE early_access_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can sign up" ON early_access_signups FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can read" ON early_access_signups FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
