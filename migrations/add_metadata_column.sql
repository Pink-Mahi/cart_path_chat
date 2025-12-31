-- Add metadata JSONB column to messages table for bilingual support
-- This stores language, original text, and translation in a single JSON field

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN (metadata);

-- Add customer_language to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_language VARCHAR(10) DEFAULT 'en';

-- Create index for language queries
CREATE INDEX IF NOT EXISTS idx_conversations_language ON conversations(customer_language);
