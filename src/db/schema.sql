-- Users table for team authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'agent', -- 'admin' or 'agent'
  phone_number VARCHAR(50),
  notify_sms BOOLEAN DEFAULT TRUE,
  notify_call BOOLEAN DEFAULT FALSE,
  notify_in_app BOOLEAN DEFAULT TRUE,
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP,
  work_schedule JSONB DEFAULT '{"monday":{"start":"09:00","end":"17:00","enabled":true},"tuesday":{"start":"09:00","end":"17:00","enabled":true},"wednesday":{"start":"09:00","end":"17:00","enabled":true},"thursday":{"start":"09:00","end":"17:00","enabled":true},"friday":{"start":"09:00","end":"17:00","enabled":true},"saturday":{"enabled":false},"sunday":{"enabled":false},"lunch_break":{"start":"12:00","end":"13:00","enabled":false}}',
  is_active BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL,
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),
  visitor_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'unassigned', -- 'unassigned', 'assigned', 'waiting', 'resolved', 'closed'
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add updated_at column to existing messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Scheduled visits table
CREATE TABLE IF NOT EXISTS scheduled_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  visitor_name VARCHAR(255) NOT NULL,
  visitor_email VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(50),
  property_address TEXT,
  property_type VARCHAR(100),
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(50) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY,
  on_duty_phone VARCHAR(50),
  notify_sms_new_chat BOOLEAN DEFAULT TRUE,
  notify_call_new_chat BOOLEAN DEFAULT FALSE,
  notify_sms_needs_human BOOLEAN DEFAULT TRUE,
  notify_call_needs_human BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call back requests table
CREATE TABLE IF NOT EXISTS call_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  visitor_name VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(50) NOT NULL,
  best_time VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name VARCHAR(255) NOT NULL,
  visitor_email VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(50) NOT NULL,
  organization_type VARCHAR(100),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Canned responses table
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut VARCHAR(50) NOT NULL UNIQUE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin presence tracking table
CREATE TABLE IF NOT EXISTS admin_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  current_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  is_typing BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team chat table for internal communication
CREATE TABLE IF NOT EXISTS team_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_conversation ON scheduled_visits(conversation_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_date ON scheduled_visits(preferred_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_status ON scheduled_visits(status);
CREATE INDEX IF NOT EXISTS idx_call_requests_status ON call_requests(status);
CREATE INDEX IF NOT EXISTS idx_call_requests_created ON call_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_presence_conversation ON admin_presence(current_conversation_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_created ON team_chat(created_at);
