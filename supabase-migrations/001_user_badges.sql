-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS user_badges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id   text        NOT NULL,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_insert_badges"
  ON user_badges FOR INSERT
  WITH CHECK (true);
