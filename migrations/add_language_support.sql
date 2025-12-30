-- Add language support to conversations and messages

-- Add language column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_language VARCHAR(10) DEFAULT 'en';

-- Add language and translation columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS original_content TEXT,
ADD COLUMN IF NOT EXISTS translated_content TEXT;

-- Create index for language queries
CREATE INDEX IF NOT EXISTS idx_conversations_language ON conversations(customer_language);
CREATE INDEX IF NOT EXISTS idx_messages_language ON messages(language);

-- Update existing messages to set language as 'en'
UPDATE messages SET language = 'en' WHERE language IS NULL;
UPDATE conversations SET customer_language = 'en' WHERE customer_language IS NULL;
