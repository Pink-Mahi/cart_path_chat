import { getActiveAdmins, isUserAvailableForNotification } from '../db/users.js';
import { sendTwilioSms, makeTwilioCall } from './twilio.js';

export async function notifyAdmins(message, type = 'new_chat') {
  try {
    const admins = await getActiveAdmins();
    
    for (const admin of admins) {
      // Check if admin should receive notification
      if (!isUserAvailableForNotification(admin)) {
        console.log(`Skipping notification for ${admin.name} - not available`);
        continue;
      }

      // Send SMS if enabled
      if (admin.notify_sms && admin.phone_number) {
        try {
          await sendTwilioSms(admin.phone_number, message);
          console.log(`SMS sent to ${admin.name} (${admin.phone_number})`);
        } catch (err) {
          console.error(`Failed to send SMS to ${admin.name}:`, err);
        }
      }

      // Send call if enabled
      if (admin.notify_call && admin.phone_number) {
        try {
          await makeTwilioCall(admin.phone_number, message);
          console.log(`Call initiated to ${admin.name} (${admin.phone_number})`);
        } catch (err) {
          console.error(`Failed to call ${admin.name}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

export async function notifyAdminsNewChat(conversationId, adminPanelUrl) {
  const link = adminPanelUrl ? `${adminPanelUrl}/dashboard.html` : null;
  const message = link
    ? `Cart Path Cleaning: New visitor message. Check dashboard: ${link}`
    : `Cart Path Cleaning: New visitor message. Check dashboard.`;
  
  await notifyAdmins(message, 'new_chat');
}

export async function notifyAdminsNeedsHuman(conversationId, adminPanelUrl) {
  const link = adminPanelUrl ? `${adminPanelUrl}/dashboard.html` : null;
  const message = link
    ? `Cart Path Cleaning: Human response needed. Check dashboard: ${link}`
    : `Cart Path Cleaning: Human response needed. Check dashboard.`;
  
  await notifyAdmins(message, 'needs_human');
}

export async function notifyAdminsScheduledVisit(visitDate, propertyAddress, adminPanelUrl) {
  const link = adminPanelUrl ? `${adminPanelUrl}/dashboard.html` : null;
  const message = link
    ? `Cart Path Cleaning: Visit scheduled for ${visitDate} at ${propertyAddress}. ${link}`
    : `Cart Path Cleaning: Visit scheduled for ${visitDate} at ${propertyAddress}.`;
  
  await notifyAdmins(message, 'scheduled_visit');
}

export async function notifyAdminsCallRequest(visitorName, visitorPhone, adminPanelUrl) {
  const link = adminPanelUrl ? `${adminPanelUrl}/dashboard.html` : null;
  const message = link
    ? `Cart Path Cleaning: Call back requested by ${visitorName} (${visitorPhone}). ${link}`
    : `Cart Path Cleaning: Call back requested by ${visitorName} (${visitorPhone}).`;
  
  await notifyAdmins(message, 'call_request');
}
