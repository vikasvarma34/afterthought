-- SUPABASE TODO TABLE MIGRATION
-- Add 'details' column to existing todos table
-- Copy and paste this into Supabase SQL Editor and click Run

-- Add details column if it doesn't exist
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS details TEXT;

-- Optional: Add index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_updated_at ON todos(user_id, updated_at DESC);
