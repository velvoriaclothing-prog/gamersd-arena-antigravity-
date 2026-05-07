-- Add game_total column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_total INTEGER DEFAULT 1;

-- Add last_reset_date to site_users if missing
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS last_reset_date TEXT;
