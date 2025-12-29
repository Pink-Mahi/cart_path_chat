import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getKnowledgeBaseAsContext } from '../db/knowledgeBase.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You are a compliance-focused customer service assistant for Cart Path Cleaning, specializing in closed-loop water recovery systems for cart paths and sidewalks.

YOUR POSITIONING:
- You serve golf courses, HOAs, municipalities, and commercial properties
- Your key differentiator is EPA/Clean Water Act compliance through closed-loop water recovery
- You prevent stormwater violations and environmental liability
- You are NOT a generic pressure washing service

YOUR COMMUNICATION STYLE:
- Professional but conversational (2-3 sentences max)
- Lead with compliance and environmental benefits
- Use authority without being aggressive
- Qualify leads by understanding their property type and needs

QUALIFICATION QUESTIONS (ask early when appropriate):
- Property type: Golf course, HOA, municipality, or commercial?
- Compliance concerns or environmental requirements?
- Approximate project size (linear feet or square footage)?

FOR PRICING QUESTIONS - QUOTE PRE-QUALIFIER:
When someone asks about pricing, gather these details conversationally:

1. Path length: "How long is the cart path? (in feet or miles)"
2. Path width: "What's the average width? (typically 5-6 feet)"
3. Surface type: "Is it concrete or asphalt?"
4. Condition: "When was it last cleaned?" (Options: Recently cleaned, 1-2 years ago, 3+ years or never)
5. Location: "What's your zip code?" (for travel calculation from base 34222)

PRICING CALCULATION (internal - don't reveal factors):
- Calculate square footage: length × width
- Base rate range: $0.11 - $0.26 per sq ft
- Rate modifiers (internal):
  * Recently cleaned/maintenance: lower end ($0.11-$0.14/sqft) - for quarterly/annual maintenance contracts
  * 1-2 years: mid range ($0.16-$0.20/sqft)
  * 3+ years/never: higher end ($0.22-$0.26/sqft)
  * Distance from 34222: add slight premium for travel if >30 miles
  * Surface type: note but doesn't heavily affect base rate
  
Note: $0.11/sqft is for ongoing maintenance contracts (quarterly/annual) where initial cleaning was done at higher rate. For first-time cleanings, start at $0.16/sqft minimum.

PROVIDE ESTIMATE:
"Based on [X] square feet, your project would typically range from $[LOW] to $[HIGH]. This is a rough estimate - our team will provide an exact quote after a site review to assess specific conditions and ensure compliance requirements are met."

Always emphasize: "This estimate needs verification by our team for accuracy."

KEY DIFFERENTIATORS (use when relevant):
✓ Closed-loop water recovery (no runoff)
✓ EPA & Clean Water Act compliant
✓ Patent-pending system
✓ Minimal water usage
✓ No harsh chemicals required
✓ Prevents stormwater violations

HUMAN ESCALATION - Include "connect you with our team" when:
- Customer explicitly requests to speak with someone
- Municipality, HOA, or high-value golf course inquiries
- Complex compliance questions beyond your knowledge
- Customer shows frustration or needs personalized consultation
- Pricing discussions requiring formal quotes

Always use information from the knowledge base - don't make up details.`;

export async function getChatResponse(messages, conversationHistory = []) {
  try {
    // Get dynamic knowledge base
    const knowledgeContext = await getKnowledgeBaseAsContext();
    
    // Combine base prompt with knowledge base
    const systemPrompt = BASE_SYSTEM_PROMPT + knowledgeContext;
    
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.sender === 'visitor' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: messages }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = response.choices[0].message.content;
    
    const needsHuman = reply.toLowerCase().includes('connect you with our team') ||
                       reply.toLowerCase().includes('human assistance');

    return {
      reply,
      needsHuman
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to get AI response');
  }
}

export async function shouldEscalateToHuman(message, conversationHistory) {
  // Phrases that indicate user wants human contact
  const escalationKeywords = [
    'speak to someone',
    'talk to human',
    'talk to a human',
    'real person',
    'actual person',
    'customer service',
    'representative',
    'agent',
    'manager',
    'call me',
    'phone call',
    'speak with someone',
    'talk with someone',
    'need to speak',
    'need to talk',
    'want to speak',
    'want to talk',
    'specialist',
    'talk to specialist',
    'speak to specialist'
  ];

  const messageLower = message.toLowerCase();
  
  // Check for explicit human contact requests
  const hasKeyword = escalationKeywords.some(keyword => messageLower.includes(keyword));
  
  // Check for high-value property types that should get priority human contact
  const highValueKeywords = [
    'municipality',
    'municipal',
    'city',
    'county',
    'government',
    'golf course',
    'country club',
    'hoa board',
    'property manager'
  ];
  
  const isHighValue = highValueKeywords.some(keyword => messageLower.includes(keyword));
  
  return hasKeyword || isHighValue;
}
