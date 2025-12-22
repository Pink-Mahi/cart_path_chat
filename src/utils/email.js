import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendHumanNeededNotification(conversation, lastMessage) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: adminEmail,
    subject: `🔔 Chat requires human assistance - ${conversation.visitor_name || 'Anonymous'}`,
    html: `
      <h2>A customer needs human assistance</h2>
      <p><strong>Visitor:</strong> ${conversation.visitor_name || 'Anonymous'}</p>
      <p><strong>Email:</strong> ${conversation.visitor_email || 'Not provided'}</p>
      <p><strong>Last message:</strong></p>
      <blockquote>${lastMessage}</blockquote>
      <p><a href="${frontendUrl}/admin/chat/${conversation.id}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reply to Chat</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">Cart Path Cleaning - Chat System</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Human needed notification sent to:', adminEmail);
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
}

export async function sendNewConversationNotification(conversation) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: adminEmail,
    subject: `💬 New chat conversation started`,
    html: `
      <h2>New chat conversation</h2>
      <p><strong>Visitor:</strong> ${conversation.visitor_name || 'Anonymous'}</p>
      <p><strong>Email:</strong> ${conversation.visitor_email || 'Not provided'}</p>
      <p><a href="${frontendUrl}/admin/conversations" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Chats</a></p>
      <hr>
      <p style="color: #666; font-size: 12px;">Cart Path Cleaning - Chat System</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send new conversation notification:', error);
  }
}
