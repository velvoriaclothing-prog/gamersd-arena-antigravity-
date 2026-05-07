-- 1. Update site_users for tiered plans and reveal tracking
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'none'; -- none, starter, pro, ultimate
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS daily_reveal_count INTEGER DEFAULT 0;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS last_reset_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Update payment_requests to track selected plan
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS plan_name TEXT;

-- 3. Create Reveal Logs Table for security and admin auditing
CREATE TABLE IF NOT EXISTS reveal_logs (
    id SERIAL PRIMARY KEY,
    user_email TEXT REFERENCES site_users(email),
    game_id TEXT,
    revealed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
