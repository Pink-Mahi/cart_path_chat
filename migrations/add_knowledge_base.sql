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

-- Insert comprehensive knowledge base entries based on cartpathcleaning.com
INSERT INTO knowledge_base (category, question, answer, is_active) VALUES

-- Services & Overview
('Services', 'What services do you offer?', 'We specialize in cleaning golf course cart paths, sidewalks, and walkways using our revolutionary closed-loop cleaning system. We serve golf facilities, country clubs, resorts, and HOA communities.', true),
('Services', 'What makes your cleaning system different?', 'Our patent-pending closed-loop system is completely different from traditional pressure washing. We use a self-contained mobile system that captures and reuses wash water, minimizing runoff and water loss.', true),
('Services', 'What can you clean?', 'We clean cart paths, sidewalks, walkways, high-traffic areas, and entry areas. Any paved surface at golf facilities, clubs, resorts, or communities.', true),

-- Closed-Loop System & Process
('Process', 'How does your closed-loop system work?', 'Our 5-step process: Apply pressurized water to clean, Recover wash water at point of cleaning, Condition water for reuse, Reuse recovered water for efficient operations, and Post-treat surface to prevent regrowth.', true),
('Process', 'What equipment do you use?', 'We use a custom-manufactured compact cleaning machine sized like a golf cart or turf mower. It captures wash water at the point of cleaning. A support water cart travels alongside and refills from an onsite water source—no hoses stretched across the course.', true),
('Process', 'How does the cleaning machine navigate?', 'Our equipment is sized like a golf cart—not a full-sized truck. We go where golf carts go, navigating the same paths without damaging turf or requiring special access. Simply drive along the path and clean in a single pass.', true),
('Process', 'Do you need to stretch hoses across the course?', 'No! Our support water cart refills from an onsite water source without stretching hoses across the course. This prevents trip hazards and course disruption.', true),
('Process', 'How many passes does it take to clean?', 'Just one pass! Our system cleans paths in a single pass, delivering consistent, professional-grade results every time.', true),

-- Benefits
('Benefits', 'Why choose your service over traditional pressure washing?', 'Traditional pressure washing doesn''t work for large-scale path cleaning. Our closed-loop system is faster, uses significantly less water, causes zero downtime, is eco-friendly, cost-effective, and delivers professional results in a single pass.', true),
('Benefits', 'How much faster is your cleaning?', 'We complete projects in less time than traditional methods. Our efficient workflow reduces manual labor and helps shorten project timelines significantly.', true),
('Benefits', 'How much water do you use?', 'We use significantly less water than traditional pressure washing. Our wash water is recovered and reused as part of a closed-loop process, reducing runoff and overall water consumption.', true),
('Benefits', 'Will you disrupt operations or play?', 'Zero downtime! We keep your golf course open during cleaning. We work around active play just like maintenance crews mowing fairways. No course closure required.', true),
('Benefits', 'Is your process environmentally friendly?', 'Yes! Minimal water usage, no runoff pollution, and efficient operation make us the sustainable choice for path cleaning.', true),
('Benefits', 'Is it cost-effective?', 'Absolutely. Faster completion times and reduced water costs mean significant savings compared to traditional pressure washing methods.', true),
('Benefits', 'What kind of results can I expect?', 'Clean, sparkling paths in a single pass with consistent, professional-grade results every time. Pristine appearance with zero disruption.', true),

-- Golf Facilities
('Golf Facilities', 'Can you clean while the course is open?', 'Yes! We keep cart paths and high-traffic areas pristine without closing holes or disrupting play. Our efficient system works alongside your regular maintenance operations.', true),
('Golf Facilities', 'What if we have limited water access?', 'No problem! Our closed-loop system works with limited water access since we recover and reuse wash water throughout the cleaning process.', true),
('Golf Facilities', 'Do you offer seasonal or recurring service?', 'Yes, we offer both seasonal and recurring service options to keep your cart paths looking professional year-round.', true),

-- Country Clubs & Resorts
('Country Clubs', 'How do you maintain discretion during service?', 'We offer discreet service options to help you maintain premium standards without disrupting member or guest experience. Our compact equipment and efficient process minimize visibility and noise.', true),
('Country Clubs', 'Can you work around events and peak hours?', 'Yes! We offer flexible scheduling to work around events, peak hours, and member activities. We coordinate with your operations team for minimal disruption.', true),
('Country Clubs', 'What areas can you clean at clubs and resorts?', 'We clean paths, walkways, entry areas, and any high-traffic paved surfaces. Perfect for maintaining member-ready presentation year-round and safe, clean walkways for guests and staff.', true),

-- HOA Communities
('HOA Communities', 'How does clean sidewalks affect property values?', 'Clean, well-maintained sidewalks and common area pathways enhance curb appeal and property values. Our fast, efficient cleaning means minimal disruption to residents.', true),
('HOA Communities', 'Will residents be disrupted during cleaning?', 'Minimal disruption! Our efficient process and compact equipment allow us to work quickly without interfering with residents'' daily routines.', true),
('HOA Communities', 'Is this a cost-effective solution for HOAs?', 'Yes, our efficient process, reduced water costs, and faster completion times make us a cost-effective maintenance solution for HOA communities.', true),

-- Pricing & Quotes
('Pricing', 'How much does it cost?', 'Pricing depends on the size and condition of your property. We offer free consultations and site assessments. Request a quote through our chat or schedule a callback to discuss your specific needs.', true),
('Pricing', 'Do you offer free quotes?', 'Yes! We provide free consultations and site assessments. Reach out through our chat to get started.', true),

-- Scheduling & Process
('Scheduling', 'How do I get started?', 'Simple 4-step process: Contact us for a free consultation and site assessment, Schedule a convenient time that works with your operations, We arrive and complete the job quickly and professionally, Enjoy pristine, sparkling clean paths with zero disruption.', true),
('Scheduling', 'How do I schedule a service?', 'You can schedule directly through our chat by providing your property details and preferred date/time, or request a callback and we''ll reach out to discuss your needs.', true),
('Scheduling', 'Can you work around our schedule?', 'Absolutely! We choose a convenient time that works with your operations, whether that''s early morning, during low-traffic periods, or around special events.', true),

-- Coverage & Service Areas
('Coverage', 'Who do you serve?', 'We serve golf facilities, country clubs, resorts, and HOA communities. Any organization with cart paths, sidewalks, or walkways that need professional cleaning.', true),
('Coverage', 'What types of properties do you work with?', 'Golf courses, country clubs, resorts, and residential HOA communities. We specialize in large-scale path and sidewalk cleaning for these facilities.', true),

-- Technical & Equipment
('Equipment', 'What size is your equipment?', 'Our equipment is sized like a golf cart or turf mower—not a full-sized truck. This allows us to navigate the same paths golf carts use without damaging turf or requiring special access.', true),
('Equipment', 'Will your equipment damage our turf or landscaping?', 'No! Our compact, golf cart-sized equipment is designed to go where golf carts go without damaging turf, landscaping, or requiring special access routes.', true),

-- Environmental
('Environmental', 'Do you create runoff pollution?', 'No! Our closed-loop system captures wash water at the point of cleaning, minimizing runoff. This prevents pollution and protects the environment.', true),
('Environmental', 'How do you prevent regrowth of algae or mold?', 'After cleaning, we apply a post-treatment to the surface that helps prevent regrowth of algae, mold, and other contaminants.', true),

-- Problems with Traditional Methods
('Process', 'Why doesn''t traditional pressure washing work?', 'Traditional pressure washing creates impossible challenges for large-scale path cleaning. It uses excessive water, creates runoff, requires course closure, and is inefficient for the scale of golf facilities and communities.', true);
