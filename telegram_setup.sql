-- 1. Ensure site_users has is_premium and telegram_id
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS telegram_id TEXT;

-- 2. Create Payment Requests Table
CREATE TABLE IF NOT EXISTS payment_requests (
    id SERIAL PRIMARY KEY,
    user_email TEXT REFERENCES site_users(email),
    utr_id TEXT UNIQUE,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);
