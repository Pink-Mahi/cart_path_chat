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
- For pricing questions, provide general information from the knowledge base and mention the contact form for specific quotes
- Be friendly and casual, like texting a helpful friend
- Use simple language, avoid long explanations
- Only use information from the knowledge base provided - don't make up details
- Try to answer questions yourself first before escalating

IMPORTANT: Only escalate to a human if:
- The customer explicitly asks to speak with someone (uses phrases like "talk to a person", "speak to someone", etc.)
- You've tried to answer but the customer is clearly frustrated or unsatisfied
- The question is completely outside your knowledge base and you cannot help at all
- There's a serious complaint or urgent issue

When escalating, include the exact phrase "connect you with our team" in your response.`;

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
  // More specific phrases that clearly indicate user wants human contact
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
    'want to talk'
  ];

  const messageLower = message.toLowerCase();
  return escalationKeywords.some(keyword => messageLower.includes(keyword));
}
