import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getKnowledgeBaseAsContext } from '../db/knowledgeBase.js';
import { calculateCartPathPricing } from '../utils/pricingCalculator.js';

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
- KEEP RESPONSES SHORT: 2-3 sentences maximum (this is critical for audio playback)
- Be direct and conversational - no lengthy explanations
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
5. Location: "What's your zip code?" (for travel calculation)

PRICING CALCULATION:
When you have gathered length, width, and condition information, YOU MUST use the calculate_cart_path_pricing function to get accurate pricing.

NEVER calculate pricing manually - always use the function to ensure accuracy.

Condition categories for the function:
- 'maintenance' or 'recently cleaned': For ongoing maintenance contracts ($0.14-$0.16/sqft)
- 'moderate' or '1-2 years': Mid-range for paths cleaned 1-2 years ago ($0.16-$0.20/sqft)
- 'heavy' or '3+ years' or 'never': Higher rate for heavily soiled paths ($0.18-$0.24/sqft)

After receiving the calculation result, present it conversationally:
"For [X] square feet, you're looking at roughly [formattedRange]. Our team will provide an exact quote after a quick site review."

For 3+ year old paths: "We offer discounts on initial cleaning when you sign up for annual maintenance."

Keep pricing discussions SHORT - offer to connect them with the team for detailed quotes.

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

    const tools = [
      {
        type: 'function',
        function: {
          name: 'calculate_cart_path_pricing',
          description: 'Calculate accurate pricing for cart path cleaning based on dimensions and condition. Use this whenever you need to provide a price estimate.',
          parameters: {
            type: 'object',
            properties: {
              length: {
                type: 'number',
                description: 'The length of the cart path'
              },
              lengthUnit: {
                type: 'string',
                enum: ['feet', 'miles'],
                description: 'The unit of measurement for length (feet or miles)'
              },
              width: {
                type: 'number',
                description: 'The width of the cart path in feet'
              },
              condition: {
                type: 'string',
                enum: ['maintenance', 'moderate', 'heavy'],
                description: 'The condition of the path: maintenance (recently cleaned), moderate (1-2 years), or heavy (3+ years/never cleaned)'
              }
            },
            required: ['length', 'lengthUnit', 'width', 'condition']
          }
        }
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 150,
      tools,
      tool_choice: 'auto'
    });

    const message = response.choices[0].message;
    
    // Check if AI wants to use a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      
      if (toolCall.function.name === 'calculate_cart_path_pricing') {
        // Parse the function arguments
        const args = JSON.parse(toolCall.function.arguments);
        
        // Execute the pricing calculation
        const pricingResult = calculateCartPathPricing(args);
        
        // Send the function result back to the AI
        const secondResponse = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            ...formattedMessages,
            message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(pricingResult)
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        });
        
        const reply = secondResponse.choices[0].message.content;
        const needsHuman = reply.toLowerCase().includes('connect you with our team') ||
                           reply.toLowerCase().includes('human assistance');
        
        return {
          reply,
          needsHuman
        };
      }
    }
    
    // No function call - return regular response
    const reply = message.content;
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
