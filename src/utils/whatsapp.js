import dotenv from 'dotenv';

dotenv.config();

// WhatsApp Business API integration
// You can use Twilio, WhatsApp Business API, or a service like Wassenger

const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === 'true';
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER; // Your business WhatsApp number
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP; // Your personal WhatsApp to receive notifications

// Option 1: Using Twilio WhatsApp API
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER; // Format: whatsapp:+14155238886

export async function sendWhatsAppNotification(conversation, message, type = 'human_needed') {
  if (!WHATSAPP_ENABLED) {
    console.log('WhatsApp notifications disabled');
    return;
  }

  try {
    const notificationMessage = formatWhatsAppMessage(conversation, message, type);
    
    // Using Twilio WhatsApp API
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      await sendViaTwilio(notificationMessage);
    } else {
      // Fallback: Log the message (you can implement other providers)
      console.log('WhatsApp notification:', notificationMessage);
    }
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
  }
}

function formatWhatsAppMessage(conversation, message, type) {
  const visitorName = conversation.visitor_name || 'Anonymous';
  const visitorEmail = conversation.visitor_email || 'No email';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  if (type === 'human_needed') {
    return `🔔 *Customer needs assistance*

👤 Name: ${visitorName}
📧 Email: ${visitorEmail}

💬 Message:
"${message}"

🔗 Reply here: ${frontendUrl}/admin/chat/${conversation.id}`;
  } else if (type === 'scheduling') {
    return `📅 *New visit scheduled*

👤 Name: ${visitorName}
📧 Email: ${visitorEmail}
📍 ${message}

🔗 View details: ${frontendUrl}/admin.html`;
  }
  
  return message;
}

async function sendViaTwilio(message) {
  // Twilio WhatsApp API implementation
  const accountSid = TWILIO_ACCOUNT_SID;
  const authToken = TWILIO_AUTH_TOKEN;
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const params = new URLSearchParams({
    From: TWILIO_WHATSAPP_NUMBER,
    To: `whatsapp:${ADMIN_WHATSAPP}`,
    Body: message
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.statusText}`);
  }

  console.log('WhatsApp notification sent via Twilio');
}

// Alternative: Generate WhatsApp click-to-chat link
export function generateWhatsAppChatLink(phoneNumber, message) {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

// For customers to contact you directly via WhatsApp
export function getBusinessWhatsAppLink() {
  if (!WHATSAPP_NUMBER) return null;
  
  const cleanNumber = WHATSAPP_NUMBER.replace(/\D/g, '');
  const message = "Hi! I'd like to learn more about your cart path cleaning services.";
  return generateWhatsAppChatLink(cleanNumber, message);
}
