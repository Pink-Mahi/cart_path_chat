import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getKnowledgeBaseAsContext } from '../db/knowledgeBase.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You are a helpful customer service assistant for Cart Path Cleaning, a professional cart path and sidewalk cleaning service.

Your role:
- Answer questions about our services professionally and helpfully using the knowledge base provided
- Keep responses SHORT and conversational (2-3 sentences max)
- If asked about pricing, briefly mention we need property details and suggest using the contact form
- Be friendly and casual, like texting a helpful friend
- Use simple language, avoid long explanations
- Only use information from the knowledge base provided - don't make up details

IMPORTANT: If you detect that the customer needs to speak with a human for any of these reasons:
- Complex questions you cannot fully answer
- Specific pricing discussions or quotes
- Scheduling service appointments
- Complaints or concerns
- Requests for detailed property assessments
- Questions requiring personalized advice

You MUST include the exact phrase "connect you with our team" in your response to trigger human escalation.`;

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
  const escalationKeywords = [
    'speak to someone',
    'talk to human',
    'talk to a human',
    'real person',
    'actual person',
    'customer service',
    'complaint',
    'urgent',
    'emergency',
    'schedule',
    'book',
    'appointment',
    'quote',
    'pricing',
    'how much',
    'cost',
    'price',
    'estimate',
    'representative',
    'agent',
    'manager',
    'call me',
    'phone call',
    'speak with',
    'talk with'
  ];

  const messageLower = message.toLowerCase();
  return escalationKeywords.some(keyword => messageLower.includes(keyword));
}
