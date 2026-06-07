-- ============================================
-- Wellaryn Chat — Migration
-- Real-time messaging between Coach/Doctor ↔ Athlete
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversation ON chat_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id, read, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
CREATE POLICY "users_read_own_messages" ON chat_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "users_insert_messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Receiver can mark messages as read
CREATE POLICY "receiver_marks_read" ON chat_messages
  FOR UPDATE USING (auth.uid() = receiver_id);

GRANT ALL ON chat_messages TO anon, authenticated;

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
