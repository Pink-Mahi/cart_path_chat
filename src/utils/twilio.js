import dotenv from 'dotenv';

dotenv.config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM;
const TWILIO_CALL_FROM = process.env.TWILIO_CALL_FROM || process.env.TWILIO_SMS_FROM;

function isTwilioConfigured() {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_SMS_FROM || TWILIO_CALL_FROM));
}

function authHeader() {
  return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
}

export async function sendTwilioSms(to, body) {
  if (!isTwilioConfigured() || !TWILIO_SMS_FROM) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams({
    From: TWILIO_SMS_FROM,
    To: to,
    Body: body
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio SMS failed: ${res.status} ${text}`);
  }
}

export async function makeTwilioCall(to, sayMessage) {
  if (!isTwilioConfigured() || !TWILIO_CALL_FROM) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${escapeXml(
    sayMessage
  )}</Say></Response>`;

  const params = new URLSearchParams({
    From: TWILIO_CALL_FROM,
    To: to,
    Twiml: twiml
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio call failed: ${res.status} ${text}`);
  }
}

function escapeXml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
