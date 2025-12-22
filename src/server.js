import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getOrCreateConversation,
  addMessage,
  getMessages,
  getAllConversations,
  updateConversationStatus,
  getConversation
} from './db/database.js';
import { getChatResponse, shouldEscalateToHuman } from './ai/openai.js';
import { sendHumanNeededNotification } from './utils/email.js';
import { sendWhatsAppNotification, getBusinessWhatsAppLink } from './utils/whatsapp.js';
import { sendTwilioSms, makeTwilioCall } from './utils/twilio.js';
import {
  createScheduledVisit,
  getScheduledVisits,
  getScheduledVisit,
  updateScheduledVisitStatus
} from './db/scheduling.js';
import { getAdminSettings, updateAdminSettings } from './db/adminSettings.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const ADMIN_PANEL_USER = process.env.ADMIN_PANEL_USER;
const ADMIN_PANEL_PASS = process.env.ADMIN_PANEL_PASS;
const ADMIN_PANEL_URL =
  process.env.ADMIN_PANEL_URL ||
  process.env.COOLIFY_URL ||
  (process.env.COOLIFY_FQDN ? `https://${process.env.COOLIFY_FQDN}` : null);
const DEFAULT_ON_DUTY_PHONE = process.env.DEFAULT_ON_DUTY_PHONE;

function requireAdminAuth(req, res, next) {
  if (!ADMIN_PANEL_USER || !ADMIN_PANEL_PASS) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Cart Path Chat Admin"');
    return res.status(401).send('Authentication required');
  }

  const base64Credentials = authHeader.slice('Basic '.length).trim();
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  if (username !== ADMIN_PANEL_USER || password !== ADMIN_PANEL_PASS) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Cart Path Chat Admin"');
    return res.status(401).send('Invalid credentials');
  }

  return next();
}

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, 'https://cartpathcleaning.com', 'http://cartpathcleaning.com'],
  credentials: true
}));
app.use(express.json());

// Store active WebSocket connections
const connections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const visitorId = uuidv4();
  connections.set(visitorId, ws);
  
  console.log(`New WebSocket connection: ${visitorId}`);
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleChatMessage(ws, visitorId, message);
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Failed to process message'
      }));
    }
  });
  
  ws.on('close', () => {
    connections.delete(visitorId);
    console.log(`WebSocket closed: ${visitorId}`);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'system',
    content: 'Connected to Cart Path Cleaning support',
    visitorId
  }));
});

async function handleChatMessage(ws, visitorId, message) {
  const { type, content, visitorName, visitorEmail, conversationId } = message;
  
  // Get or create conversation for all message types
  const conversation = await getOrCreateConversation(
    conversationId || visitorId,
    visitorName,
    visitorEmail
  );
  
  if (type === 'chat') {
    const existingMessages = await getMessages(conversation.id, 1);
    const isFirstVisitorMessage = existingMessages.length === 0;

    // Save visitor message
    await addMessage(conversation.id, 'visitor', content);

    if (isFirstVisitorMessage) {
      await sendWhatsAppNotification(conversation, content, 'new_chat');

      const settings = await getAdminSettings();
      const to = settings.on_duty_phone || DEFAULT_ON_DUTY_PHONE;
      if (to) {
        const link = ADMIN_PANEL_URL ? `${ADMIN_PANEL_URL}/admin.html` : null;
        const smsBody = link
          ? `New website chat: "${content}"\nOpen: ${link}`
          : `New website chat: "${content}"`;

        if (settings.notify_sms_new_chat) {
          try {
            await sendTwilioSms(to, smsBody);
          } catch (err) {
            console.error('Twilio SMS new_chat failed:', err);
          }
        }

        if (settings.notify_call_new_chat) {
          try {
            await makeTwilioCall(to, 'New sales lead from website chat. Please check the admin panel.');
          } catch (err) {
            console.error('Twilio call new_chat failed:', err);
          }
        }
      }
    }
    
    // Get conversation history
    const history = await getMessages(conversation.id);
    
    // Check if should escalate to human
    const needsEscalation = await shouldEscalateToHuman(content, history);
    
    if (needsEscalation) {
      await sendHumanNeededNotification(conversation, content);
      await sendWhatsAppNotification(conversation, content, 'human_needed');

      const settings = await getAdminSettings();
      const to = settings.on_duty_phone || DEFAULT_ON_DUTY_PHONE;
      if (to) {
        const link = ADMIN_PANEL_URL ? `${ADMIN_PANEL_URL}/admin.html` : null;
        const smsBody = link
          ? `Chat needs a human now.\nMessage: "${content}"\nOpen: ${link}`
          : `Chat needs a human now. Message: "${content}"`;

        if (settings.notify_sms_needs_human) {
          try {
            await sendTwilioSms(to, smsBody);
          } catch (err) {
            console.error('Twilio SMS needs_human failed:', err);
          }
        }

        if (settings.notify_call_needs_human) {
          try {
            await makeTwilioCall(to, 'Website chat needs a human response. Please check the admin panel.');
          } catch (err) {
            console.error('Twilio call needs_human failed:', err);
          }
        }
      }

      await updateConversationStatus(conversation.id, 'needs_human');
      
      const whatsappLink = getBusinessWhatsAppLink();
      const responseMessage = whatsappLink 
        ? `I'd like to connect you with our team for personalized assistance. You can also reach us directly on WhatsApp: ${whatsappLink}`
        : "I'd like to connect you with our team for personalized assistance. Someone will reach out to you shortly at the email you provided.";
      
      ws.send(JSON.stringify({
        type: 'bot',
        content: responseMessage,
        conversationId: conversation.id,
        needsHuman: true,
        whatsappLink
      }));
      return;
    }
    
    // Get AI response
    const { reply, needsHuman } = await getChatResponse(content, history);
    
    // Save bot response
    await addMessage(conversation.id, 'bot', reply);
    
    // Send response to client
    ws.send(JSON.stringify({
      type: 'bot',
      content: reply,
      conversationId: conversation.id,
      needsHuman
    }));
    
    // If AI detected need for human, send notification
    if (needsHuman) {
      await sendHumanNeededNotification(conversation, content);
      await sendWhatsAppNotification(conversation, content, 'human_needed');

      const settings = await getAdminSettings();
      const to = settings.on_duty_phone || DEFAULT_ON_DUTY_PHONE;
      if (to) {
        const link = ADMIN_PANEL_URL ? `${ADMIN_PANEL_URL}/admin.html` : null;
        const smsBody = link
          ? `Chat needs a human now.\nMessage: "${content}"\nOpen: ${link}`
          : `Chat needs a human now. Message: "${content}"`;

        if (settings.notify_sms_needs_human) {
          try {
            await sendTwilioSms(to, smsBody);
          } catch (err) {
            console.error('Twilio SMS needs_human failed:', err);
          }
        }

        if (settings.notify_call_needs_human) {
          try {
            await makeTwilioCall(to, 'Website chat needs a human response. Please check the admin panel.');
          } catch (err) {
            console.error('Twilio call needs_human failed:', err);
          }
        }
      }
      await updateConversationStatus(conversation.id, 'needs_human');
    }
  } else if (type === 'schedule_visit') {
    // Handle scheduling request
    try {
      const visit = await createScheduledVisit({
        conversationId: conversation.id,
        visitorName: content.visitorName,
        visitorEmail: content.visitorEmail,
        visitorPhone: content.visitorPhone,
        propertyAddress: content.propertyAddress,
        propertyType: content.propertyType,
        preferredDate: content.preferredDate,
        preferredTime: content.preferredTime,
        notes: content.notes
      });

      const scheduleMessage = `📅 Visit scheduled for ${content.preferredDate} at ${content.preferredTime}\n${content.propertyAddress}`;
      await sendWhatsAppNotification(conversation, scheduleMessage, 'scheduling');
      
      ws.send(JSON.stringify({
        type: 'system',
        content: `Great! We've scheduled your on-site visit for ${content.preferredDate} at ${content.preferredTime}. We'll send you a confirmation email shortly.`,
        conversationId: conversation.id,
        visitId: visit.id
      }));
    } catch (error) {
      console.error('Scheduling error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Sorry, there was an error scheduling your visit. Please try again.'
      }));
    }
  }
}

// REST API endpoints

// Admin settings endpoints (protected)
app.get('/api/admin-settings', requireAdminAuth, async (req, res) => {
  try {
    const settings = await getAdminSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ error: 'Failed to fetch admin settings' });
  }
});

app.patch('/api/admin-settings', requireAdminAuth, async (req, res) => {
  try {
    const updated = await updateAdminSettings(req.body || {});
    res.json(updated);
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ error: 'Failed to update admin settings' });
  }
});

// Get all conversations (for admin panel)
app.get('/api/conversations', requireAdminAuth, async (req, res) => {
  try {
    const conversations = await getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation with messages
app.get('/api/conversations/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await getConversation(id);
    const messages = await getMessages(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({
      conversation,
      messages
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Send admin reply
app.post('/api/conversations/:id/reply', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const message = await addMessage(id, 'admin', content);
    await updateConversationStatus(id, 'active');
    
    // Send message to connected client if online
    const conversation = await getConversation(id);
    const ws = connections.get(conversation.visitor_id);
    
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'admin',
        content,
        conversationId: id
      }));
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Update conversation status
app.patch('/api/conversations/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const conversation = await updateConversationStatus(id, status);
    res.json(conversation);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Scheduling endpoints
app.get('/api/scheduled-visits', requireAdminAuth, async (req, res) => {
  try {
    const visits = await getScheduledVisits();
    res.json(visits);
  } catch (error) {
    console.error('Error fetching scheduled visits:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled visits' });
  }
});

app.get('/api/scheduled-visits/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const visit = await getScheduledVisit(id);
    
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    res.json(visit);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

app.patch('/api/scheduled-visits/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const visit = await updateScheduledVisitStatus(id, status);
    res.json(visit);
  } catch (error) {
    console.error('Error updating visit status:', error);
    res.status(500).json({ error: 'Failed to update visit status' });
  }
});

// WhatsApp info endpoint
app.get('/api/whatsapp-link', (req, res) => {
  const link = getBusinessWhatsAppLink();
  res.json({ whatsappLink: link, enabled: !!link });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve admin panel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/admin.html', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/scheduled-visits.html', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/scheduled-visits.html'));
});

app.use(express.static(path.join(__dirname, '../public')));

server.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
});
