-- Add priority column to games table for manual sorting
ALTER TABLE games ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;
