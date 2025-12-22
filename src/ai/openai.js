import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful customer service assistant for Cart Path Cleaning, a professional cart path and sidewalk cleaning service.

Company Information:
- We specialize in cleaning golf course cart paths and sidewalks
- We use a patent-pending cleaning system that conserves water and minimizes disruption
- We serve golf courses, communities, and commercial properties
- Our process is faster, uses less water, and causes low disruption

Your role:
- Answer questions about our services professionally and helpfully
- Keep responses SHORT and conversational (2-3 sentences max)
- If asked about pricing, briefly mention we need property details and suggest using the contact form
- Be friendly and casual, like texting a helpful friend
- Use simple language, avoid long explanations

If you detect that the customer needs to speak with a human (complex questions, pricing discussions, scheduling), indicate this in your response.`;

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
