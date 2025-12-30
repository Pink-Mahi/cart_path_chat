import express from 'express';
import session from 'express-session';
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
  getConversation,
  assignConversation,
  query
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
import fetch from 'node-fetch';
import { createCallRequest, getCallRequests, getCallRequest, updateCallRequestStatus } from './db/callRequests.js';
import { createContactSubmission, getContactSubmissions, getContactSubmission, updateContactSubmissionStatus, assignContactSubmission } from './db/contactSubmissions.js';
import { createCannedResponse, getCannedResponses, getCannedResponse, updateCannedResponse, deleteCannedResponse } from './db/cannedResponses.js';
import { isBusinessHours, getAfterHoursMessage } from './utils/businessHours.js';
import { getActiveAdmins, isUserAvailableForNotification } from './db/users.js';
import { notifyAdminsNewChat, notifyAdminsNeedsHuman, notifyAdminsScheduledVisit, notifyAdminsCallRequest } from './utils/notifications.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import { attachUser, requireAuth, requireAdmin } from './middleware/auth.js';

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

// Old HTTP Basic Auth function - replaced with session-based auth
// Kept for reference but no longer used

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, 'https://cartpathcleaning.com', 'http://cartpathcleaning.com'],
  credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'cart-path-chat-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true only if using HTTPS everywhere
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

app.use(attachUser);

// Store active WebSocket connections
const connections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  let visitorId = null;
  let isDashboard = false;
  
  // Generate a connection ID immediately for all connections
  const connectionId = uuidv4();
  connections.set(connectionId, ws);
  console.log(`New WebSocket connection`);
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle dashboard identification
      if (message.type === 'dashboard_init') {
        isDashboard = true;
        return;
      }
      
      // Handle init message to set visitor ID (from chat widget)
      if (message.type === 'init' && message.visitorId) {
        // This is a chat widget connection
        connections.delete(connectionId);
        
        visitorId = message.visitorId;
        connections.set(visitorId, ws);
        
        ws.send(JSON.stringify({
          type: 'system',
          content: 'Hi 👋\n\nWe specialize in cart path and sidewalk cleaning using a water-recovery system designed to prevent stormwater violations.\n\nAre you looking to:\n• Reduce environmental liability\n• Get pricing\n• Learn how closed-loop cleaning works\n• Schedule a site review',
          visitorId
        }));
        return;
      }
      
      // If no visitor ID yet and not dashboard, generate one for chat messages
      if (!visitorId && !isDashboard && message.type === 'chat') {
        visitorId = uuidv4();
        connections.delete(connectionId);
        connections.set(visitorId, ws);
      }
      
      await handleChatMessage(ws, visitorId || connectionId, message);
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Failed to process message'
      }));
    }
  });
  
  ws.on('close', () => {
    if (visitorId) {
      connections.delete(visitorId);
      console.log(`WebSocket closed: ${visitorId}`);
    } else {
      connections.delete(connectionId);
      console.log(`WebSocket closed: ${connectionId}`);
    }
  });
});

async function handleChatMessage(ws, visitorId, message) {
  const { type, content, visitorName, visitorEmail, conversationId } = message;
  
  // Handle typing indicator
  if (type === 'typing') {
    // Broadcast typing status to all connected clients (for dashboard)
    const typingData = {
      type: 'visitor_typing',
      conversationId: conversationId || visitorId,
      visitorName: visitorName || 'Visitor',
      isTyping: message.isTyping
    };

    // Broadcast to all connections
    connections.forEach((clientWs) => {
      if (clientWs !== ws && clientWs.readyState === 1) { // 1 = OPEN
        clientWs.send(JSON.stringify(typingData));
      }
    });
    return;
  }
  
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
    const visitorMessage = await addMessage(conversation.id, 'visitor', content);

    // Broadcast visitor message to all connected clients (including dashboard)
    const visitorMessageData = {
      type: 'newMessage',
      conversationId: conversation.id,
      message: visitorMessage
    };
    connections.forEach((clientWs) => {
      if (clientWs !== ws && clientWs.readyState === 1) {
        clientWs.send(JSON.stringify(visitorMessageData));
      }
    });

    if (isFirstVisitorMessage) {
      await sendWhatsAppNotification(conversation, content, 'new_chat');
      await notifyAdminsNewChat(conversation.id, ADMIN_PANEL_URL);
    }
    
    // Get conversation history
    const history = await getMessages(conversation.id);
    
    // Check if should escalate to human
    const needsEscalation = await shouldEscalateToHuman(content, history);
    
    if (needsEscalation) {
      await sendHumanNeededNotification(conversation, content);
      await sendWhatsAppNotification(conversation, content, 'human_needed');
      await notifyAdminsNeedsHuman(conversation.id, ADMIN_PANEL_URL);
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
    
    // Generate audio for bot response
    let audioUrl = null;
    try {
      const ttsResponse = await fetch('https://tts.cartpathcleaning.com/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply })
      });
      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        audioUrl = `https://tts.cartpathcleaning.com${ttsData.audioUrl}`;
      }
    } catch (error) {
      console.error('TTS generation failed:', error);
      // Continue without audio if TTS fails
    }
    
    // Save bot response
    const botMessage = await addMessage(conversation.id, 'bot', reply);
    
    // Broadcast bot response to all connected clients (including dashboard)
    const botMessageData = {
      type: 'newMessage',
      conversationId: conversation.id,
      message: botMessage
    };
    connections.forEach((clientWs) => {
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify(botMessageData));
      }
    });
    
    // Send response to original client (visitor)
    ws.send(JSON.stringify({
      type: 'bot',
      content: reply,
      conversationId: conversation.id,
      needsHuman,
      audioUrl
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
          ? `Cart Path Cleaning: Human response needed. Check admin panel: ${link}`
          : `Cart Path Cleaning: Human response needed. Check admin panel.`;

        if (settings.notify_sms_needs_human) {
          try {
            await sendTwilioSms(to, smsBody);
          } catch (err) {
            console.error('Twilio SMS needs_human failed:', err);
          }
        }

        if (settings.notify_call_needs_human) {
          try {
            await makeTwilioCall(to, 'Cart Path Cleaning: Human response needed. Check the admin panel.');
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
      await notifyAdminsScheduledVisit(content.preferredDate, content.propertyAddress, ADMIN_PANEL_URL);
      
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
  } else if (type === 'request_callback') {
    // Handle call back request
    try {
      const callRequest = await createCallRequest({
        conversationId: conversation.id,
        visitorName: content.visitorName,
        visitorPhone: content.visitorPhone,
        bestTime: content.bestTime,
        notes: content.notes
      });

      console.log('Call request created:', callRequest.id);
      await notifyAdminsCallRequest(content.visitorName, content.visitorPhone, ADMIN_PANEL_URL);

      // Add a message to the conversation so it's not anonymous
      await addMessage(conversation.id, 'visitor', `Requested call back at ${content.visitorPhone}`);

      ws.send(JSON.stringify({
        type: 'system',
        content: `Thanks! We'll call you back at ${content.visitorPhone}${content.bestTime ? ` (best time: ${content.bestTime})` : ''}.`,
        conversationId: conversation.id,
        callRequestId: callRequest.id
      }));
    } catch (error) {
      console.error('Call request error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Sorry, there was an error submitting your call back request. Please try again.'
      }));
    }
  }
}

// REST API endpoints

app.post('/api/public/scheduled-visits', async (req, res) => {
  try {
    console.log('📅 Public scheduled visit request received:', req.body);
    
    const {
      visitorName,
      visitorEmail,
      visitorPhone,
      propertyAddress,
      propertyType,
      preferredDate,
      preferredTime,
      notes
    } = req.body || {};

    if (!visitorName || !visitorEmail || !visitorPhone || !propertyAddress || !preferredDate) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const visitorId = uuidv4();
    console.log('Creating conversation for visitor:', visitorId);
    const conversation = await getOrCreateConversation(visitorId, visitorName, visitorEmail);
    console.log('✅ Conversation created:', conversation.id);

    console.log('Creating scheduled visit record...');
    const visit = await createScheduledVisit({
      conversationId: conversation.id,
      visitorName,
      visitorEmail,
      visitorPhone,
      propertyAddress,
      propertyType,
      preferredDate,
      preferredTime,
      notes
    });
    console.log('✅ Scheduled visit created:', visit.id);

    await addMessage(
      conversation.id,
      'visitor',
      `Scheduled on-site visit for ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ''}. ${propertyAddress}`
    );

    const scheduleMessage = `📅 Visit scheduled for ${preferredDate} at ${preferredTime}\n${propertyAddress}`;
    await sendWhatsAppNotification(conversation, scheduleMessage, 'scheduling');
    await notifyAdminsScheduledVisit(preferredDate, propertyAddress, ADMIN_PANEL_URL);

    console.log('✅ Public scheduled visit complete - visitId:', visit.id, 'conversationId:', conversation.id);
    res.json({ success: true, visitId: visit.id, conversationId: conversation.id });
  } catch (error) {
    console.error('❌ Public scheduling error:', error);
    res.status(500).json({ error: 'Failed to create scheduled visit' });
  }
});

app.post('/api/public/call-requests', async (req, res) => {
  try {
    console.log('📞 Public call request received:', req.body);
    
    const { visitorName, visitorEmail, visitorPhone, bestTime, notes } = req.body || {};

    if (!visitorName || !visitorEmail || !visitorPhone) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const visitorId = uuidv4();
    console.log('Creating conversation for visitor:', visitorId);
    const conversation = await getOrCreateConversation(visitorId, visitorName, visitorEmail);
    console.log('✅ Conversation created:', conversation.id);

    console.log('Creating call request record...');
    const callRequest = await createCallRequest({
      conversationId: conversation.id,
      visitorName,
      visitorPhone,
      bestTime,
      notes
    });
    console.log('✅ Call request created:', callRequest.id);

    await notifyAdminsCallRequest(visitorName, visitorPhone, ADMIN_PANEL_URL);
    await addMessage(conversation.id, 'visitor', `Requested call back at ${visitorPhone}`);

    console.log('✅ Public call request complete - callRequestId:', callRequest.id, 'conversationId:', conversation.id);
    res.json({ success: true, callRequestId: callRequest.id, conversationId: conversation.id });
  } catch (error) {
    console.error('❌ Public call request error:', error);
    res.status(500).json({ error: 'Failed to create call request' });
  }
});

// Admin settings endpoints (protected)
app.get('/api/admin-settings', requireAdmin, async (req, res) => {
  try {
    const settings = await getAdminSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ error: 'Failed to fetch admin settings' });
  }
});

app.patch('/api/admin-settings', requireAdmin, async (req, res) => {
  try {
    const updated = await updateAdminSettings(req.body || {});
    res.json(updated);
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ error: 'Failed to update admin settings' });
  }
});

// Get all conversations (for admin panel)
app.get('/api/conversations', requireAuth, async (req, res) => {
  try {
    const conversations = await getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation with messages
app.get('/api/conversations/:id', requireAuth, async (req, res) => {
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
app.post('/api/conversations/:id/reply', requireAuth, async (req, res) => {
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
app.patch('/api/conversations/:id/status', requireAuth, async (req, res) => {
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

// Delete conversation
app.delete('/api/conversations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related records first if CASCADE isn't working
    await query('DELETE FROM messages WHERE conversation_id = $1', [id]);
    await query('DELETE FROM scheduled_visits WHERE conversation_id = $1', [id]);
    await query('DELETE FROM call_requests WHERE conversation_id = $1', [id]);
    await query('UPDATE admin_presence SET current_conversation_id = NULL WHERE current_conversation_id = $1', [id]);
    
    // Now delete the conversation
    const result = await query('DELETE FROM conversations WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation', details: error.message });
  }
});

// Scheduling endpoints
app.get('/api/scheduled-visits', requireAuth, async (req, res) => {
  try {
    const visits = await getScheduledVisits();
    res.json(visits);
  } catch (error) {
    console.error('Error fetching scheduled visits:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled visits' });
  }
});

app.get('/api/scheduled-visits/:id', requireAuth, async (req, res) => {
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

app.patch('/api/scheduled-visits/:id/status', requireAuth, async (req, res) => {
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

// Delete scheduled visit
app.delete('/api/scheduled-visits/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM scheduled_visits WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

// Call requests endpoints
app.get('/api/call-requests', requireAuth, async (req, res) => {
  try {
    const requests = await getCallRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching call requests:', error);
    res.status(500).json({ error: 'Failed to fetch call requests' });
  }
});

app.get('/api/call-requests/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await getCallRequest(id);
    if (!request) {
      return res.status(404).json({ error: 'Call request not found' });
    }
    res.json(request);
  } catch (error) {
    console.error('Error fetching call request:', error);
    res.status(500).json({ error: 'Failed to fetch call request' });
  }
});

app.patch('/api/call-requests/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const request = await updateCallRequestStatus(id, status);
    res.json(request);
  } catch (error) {
    console.error('Error updating call request status:', error);
    res.status(500).json({ error: 'Failed to update call request status' });
  }
});

// Delete call request
app.delete('/api/call-requests/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM call_requests WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting call request:', error);
    res.status(500).json({ error: 'Failed to delete call request' });
  }
});

// Contact submissions endpoints
app.post('/api/public/contact-submissions', async (req, res) => {
  try {
    console.log('📧 Public contact submission received:', req.body);
    
    const { visitorName, visitorEmail, visitorPhone, organizationType, message } = req.body || {};

    if (!visitorName || !visitorEmail || !visitorPhone || !message) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Creating contact submission record...');
    const submission = await createContactSubmission({
      visitorName,
      visitorEmail,
      visitorPhone,
      organizationType,
      message
    });
    console.log('✅ Contact submission created:', submission.id);

    // Notify admins about new contact submission (SMS + WhatsApp)
    await notifyAdminsNewChat(visitorName, ADMIN_PANEL_URL);

    console.log('✅ Public contact submission complete - submissionId:', submission.id);
    res.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('❌ Public contact submission error:', error);
    res.status(500).json({ error: 'Failed to create contact submission' });
  }
});

app.get('/api/contact-submissions', requireAuth, async (req, res) => {
  try {
    const submissions = await getContactSubmissions();
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({ error: 'Failed to fetch contact submissions' });
  }
});

app.get('/api/contact-submissions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await getContactSubmission(id);
    if (!submission) {
      return res.status(404).json({ error: 'Contact submission not found' });
    }
    res.json(submission);
  } catch (error) {
    console.error('Error fetching contact submission:', error);
    res.status(500).json({ error: 'Failed to fetch contact submission' });
  }
});

app.patch('/api/contact-submissions/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const submission = await updateContactSubmissionStatus(id, status);
    res.json(submission);
  } catch (error) {
    console.error('Error updating contact submission status:', error);
    res.status(500).json({ error: 'Failed to update contact submission status' });
  }
});

app.patch('/api/contact-submissions/:id/assign', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const submission = await assignContactSubmission(id, userId);
    res.json(submission);
  } catch (error) {
    console.error('Error assigning contact submission:', error);
    res.status(500).json({ error: 'Failed to assign contact submission' });
  }
});

app.delete('/api/contact-submissions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM contact_submissions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    res.status(500).json({ error: 'Failed to delete contact submission' });
  }
});

// Canned responses endpoints
app.get('/api/canned-responses', requireAuth, async (req, res) => {
  try {
    const responses = await getCannedResponses();
    res.json(responses);
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    res.status(500).json({ error: 'Failed to fetch canned responses' });
  }
});

app.post('/api/canned-responses', requireAdmin, async (req, res) => {
  try {
    const { shortcut, message } = req.body;
    const response = await createCannedResponse(shortcut, message);
    res.json(response);
  } catch (error) {
    console.error('Error creating canned response:', error);
    res.status(500).json({ error: 'Failed to create canned response' });
  }
});

app.patch('/api/canned-responses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { shortcut, message } = req.body;
    const response = await updateCannedResponse(id, shortcut, message);
    res.json(response);
  } catch (error) {
    console.error('Error updating canned response:', error);
    res.status(500).json({ error: 'Failed to update canned response' });
  }
});

app.delete('/api/canned-responses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCannedResponse(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting canned response:', error);
    res.status(500).json({ error: 'Failed to delete canned response' });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Team chat routes
import teamChatRoutes from './routes/teamChat.js';
app.use('/api/team-chat', teamChatRoutes);

// Knowledge base routes
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
app.use('/api/knowledge-base', knowledgeBaseRoutes);

// Conversation assignment endpoints
app.post('/api/conversations/:id/assign', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const conversation = await assignConversation(id, userId);
    res.json(conversation);
  } catch (error) {
    console.error('Error assigning conversation:', error);
    res.status(500).json({ error: 'Failed to assign conversation' });
  }
});

// Business hours endpoint
app.get('/api/business-hours', (req, res) => {
  const inHours = isBusinessHours();
  const message = inHours ? null : getAfterHoursMessage();
  res.json({ inBusinessHours: inHours, afterHoursMessage: message });
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

app.get('/admin.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/scheduled-visits.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/scheduled-visits.html'));
});

app.use(express.static(path.join(__dirname, '../public')));

server.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
});
