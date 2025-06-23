-- PostgreSQL Database Setup Script for AI Chat Application
-- Run this script after creating your PostgreSQL database

-- Create sessions table for session storage
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index on expire column for performance
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE,
    password_hash VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    token_quota INTEGER DEFAULT 10000,
    token_used INTEGER DEFAULT 0,
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR,
    reset_token VARCHAR,
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin config table
CREATE TABLE IF NOT EXISTS admin_config (
    id SERIAL PRIMARY KEY,
    api_provider VARCHAR DEFAULT 'openai',
    api_key VARCHAR,
    api_endpoint VARCHAR,
    model_name VARCHAR DEFAULT 'gpt-4',
    default_token_quota INTEGER DEFAULT 10000,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR DEFAULT 'New Conversation',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant')),
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Insert default admin user (password: admin123)
-- Change this password after first login!
INSERT INTO users (
    id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    is_active, 
    is_admin, 
    email_verified,
    token_quota
) VALUES (
    'admin-' || gen_random_uuid()::text,
    'admin@localhost',
    '$2a$12$rMaOjQqBmV6/8lQWKOKFBOkRv8FkxLGBK9XFEK8V7kYgNxBQCdkru',  -- admin123
    'Admin',
    'User',
    true,
    true,
    true,
    100000
) ON CONFLICT (email) DO NOTHING;

-- Insert default admin configuration
INSERT INTO admin_config (
    api_provider,
    model_name,
    default_token_quota,
    is_active
) VALUES (
    'openai',
    'gpt-4',
    10000,
    false
) ON CONFLICT DO NOTHING;

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'Default admin credentials:';
    RAISE NOTICE 'Email: admin@localhost';
    RAISE NOTICE 'Password: admin123';
    RAISE NOTICE 'Please change the admin password after first login!';
END $$;