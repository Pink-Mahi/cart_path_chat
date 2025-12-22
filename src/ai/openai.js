import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful customer service assistant for Cart Path Cleaning, a company that provides professional golf cart path and sidewalk cleaning services.

Key information about the business:
- Services: Golf cart path cleaning, sidewalk cleaning, and surface maintenance
- Technology: Patent-pending cleaning system that uses significantly less water
- Benefits: Faster cleaning, less water consumption, minimal disruption to golf course play
- Service areas: Florida, Texas, and Nevada (expanding to other locations)
- Process: Professional equipment, eco-friendly approach, minimal downtime

Common questions to answer:
1. Service areas and availability
2. Pricing (encourage them to request a quote via contact form)
3. How the cleaning process works
4. Water savings and environmental benefits
5. Scheduling and timing
6. Maintenance programs

If a customer asks about:
- Specific pricing: Politely explain that pricing varies by project size and condition, and encourage them to fill out the contact form or provide their email for a custom quote
- Scheduling: Ask for their location and property details, then suggest they contact directly
- Technical details: Explain the patent-pending technology focuses on efficiency and water conservation

If you cannot answer a question or the customer needs human assistance, respond with: "I'd like to connect you with our team for personalized assistance. Could you please provide your email address?"

Be friendly, professional, and concise. Focus on helping customers understand the value of the service.`;

export async function getChatResponse(messages, conversationHistory = []) {
  try {
    const formattedMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
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
  const escalationKeywords = [
    'speak to someone',
    'talk to human',
    'real person',
    'customer service',
    'complaint',
    'urgent',
    'emergency'
  ];

  const messageLower = message.toLowerCase();
  return escalationKeywords.some(keyword => messageLower.includes(keyword));
}
