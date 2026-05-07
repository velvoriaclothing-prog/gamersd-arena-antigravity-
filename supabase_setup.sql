-- SQL for Supabase SQL Editor
-- Run this to create the necessary tables for Gamers Arena

-- 1. Games Table
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    game TEXT,
    username TEXT,
    password TEXT,
    image TEXT DEFAULT 'logo.png',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Premium Bundles Table
CREATE TABLE IF NOT EXISTS bundles (
    id TEXT PRIMARY KEY,
    name TEXT,
    price TEXT,
    description TEXT,
    image TEXT DEFAULT 'logo.png',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Site Content Table
CREATE TABLE IF NOT EXISTS site_content (
    id TEXT PRIMARY KEY, -- 'main_content'
    data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Users Table (Admin)
CREATE TABLE IF NOT EXISTS site_users (
    email TEXT PRIMARY KEY,
    name TEXT,
    password TEXT,
    role TEXT DEFAULT 'user'
);

-- Insert default admin
INSERT INTO site_users (email, name, password, role) 
VALUES ('admin', 'Admin', 'admin', 'admin')
ON CONFLICT (email) DO NOTHING;
