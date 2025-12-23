-- Knowledge base table for AI training data
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base(is_active);

-- Insert default knowledge base entries
INSERT INTO knowledge_base (category, question, answer, is_active) VALUES
('Services', 'What services do you offer?', 'We specialize in cleaning golf course cart paths and sidewalks using our patent-pending cleaning system. We serve golf courses, communities, and commercial properties.', true),
('Process', 'How does your cleaning process work?', 'Our patent-pending system uses significantly less water than traditional methods and causes minimal disruption to your property. The process is faster and more efficient than conventional cleaning.', true),
('Benefits', 'What are the benefits of your service?', 'Our cleaning process is faster, uses less water, and causes low disruption to your daily operations. We can clean while your facility remains open.', true),
('Pricing', 'How much does it cost?', 'Pricing depends on the size and condition of your property. We''d be happy to provide a free quote after learning more about your specific needs. You can schedule a visit or request a callback to discuss pricing.', true),
('Coverage', 'What areas do you serve?', 'We serve golf courses, residential communities, and commercial properties. Contact us to confirm we service your area.', true),
('Scheduling', 'How do I schedule a service?', 'You can schedule a visit directly through our chat by providing your property details and preferred date/time, or request a callback and we''ll reach out to you.', true);
