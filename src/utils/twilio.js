import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM;
const TWILIO_CALL_FROM = process.env.TWILIO_CALL_FROM || process.env.TWILIO_SMS_FROM;

function isTwilioConfigured() {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_SMS_FROM || TWILIO_CALL_FROM));
}

function getTwilioClient() {
  if (!isTwilioConfigured()) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function sendTwilioSms(to, body) {
  const client = getTwilioClient();
  if (!client || !TWILIO_SMS_FROM) return;

  await client.messages.create({
    from: TWILIO_SMS_FROM,
    to: to,
    body: body
  });
}

export async function makeTwilioCall(to, sayMessage) {
  const client = getTwilioClient();
  if (!client || !TWILIO_CALL_FROM) return;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${escapeXml(
    sayMessage
  )}</Say></Response>`;

  await client.calls.create({
    from: TWILIO_CALL_FROM,
    to: to,
    twiml: twiml
  });
}

function escapeXml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
