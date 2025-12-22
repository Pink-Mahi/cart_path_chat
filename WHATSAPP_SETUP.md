# WhatsApp Integration Setup Guide

This guide explains how to set up WhatsApp notifications for your chat system.

## Why WhatsApp?

WhatsApp provides a better mobile experience than the web admin panel:
- ✅ Native mobile app (better than PWA)
- ✅ Push notifications
- ✅ Quick replies from your phone
- ✅ Familiar interface
- ✅ Works everywhere

## Option 1: Twilio WhatsApp API (Recommended)

Twilio provides an official WhatsApp Business API integration.

### Setup Steps

1. **Create Twilio Account**
   - Go to https://www.twilio.com/
   - Sign up for free trial ($15 credit)
   - Verify your phone number

2. **Enable WhatsApp Sandbox**
   - In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Follow instructions to connect your WhatsApp to Twilio sandbox
   - Send the code from your WhatsApp to join sandbox

3. **Get Credentials**
   - Account SID: Found in Twilio Console dashboard
   - Auth Token: Found in Twilio Console dashboard
   - WhatsApp Number: `whatsapp:+14155238886` (Twilio sandbox number)

4. **Update Environment Variables**

Add to your `.env` file in Coolify:

```env
WHATSAPP_ENABLED=true
WHATSAPP_NUMBER=+1234567890
ADMIN_WHATSAPP=+1234567890
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

Replace:
- `WHATSAPP_NUMBER`: Your business WhatsApp number (for customer contact)
- `ADMIN_WHATSAPP`: Your personal WhatsApp number (receives notifications)
- `TWILIO_ACCOUNT_SID`: From Twilio dashboard
- `TWILIO_AUTH_TOKEN`: From Twilio dashboard

5. **Test It**
   - Restart your backend in Coolify
   - Start a chat on your website
   - Ask to speak to a human
   - You should receive a WhatsApp message!

### Twilio Pricing

**Sandbox (Free):**
- Free for testing
- Limited to numbers you've approved
- Twilio branding in messages

**Production ($0.005/message):**
- Apply for WhatsApp Business API approval
- Your own WhatsApp Business number
- No Twilio branding
- ~$5-10/month for 1000-2000 messages

---

## Option 2: WhatsApp Business App (Free, Manual)

If you don't want to use Twilio, you can use WhatsApp Business app directly.

### Setup Steps

1. **Download WhatsApp Business**
   - Install from App Store or Google Play
   - Set up with your business phone number

2. **Configure Click-to-Chat**

Update `.env`:
```env
WHATSAPP_ENABLED=true
WHATSAPP_NUMBER=+1234567890
ADMIN_WHATSAPP=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
```

Only set `WHATSAPP_NUMBER` (your business WhatsApp).

3. **How It Works**
   - Chat widget shows "WhatsApp" button
   - Customers click → Opens WhatsApp with pre-filled message
   - You receive message in WhatsApp Business app
   - Reply manually from app

**Pros:**
- Free
- No API costs
- Simple setup

**Cons:**
- No automatic notifications for "human needed"
- Manual process
- You need to monitor WhatsApp app

---

## Option 3: Alternative Services

### Wassenger (Easiest)
- https://wassenger.com/
- WhatsApp API without Twilio
- $29/month
- Easier setup, better UI

### MessageBird
- https://messagebird.com/
- WhatsApp Business API
- Similar to Twilio

### 360dialog
- https://www.360dialog.com/
- Official WhatsApp Business Solution Provider
- More expensive but official

---

## Testing Your Setup

### Test Automatic Notifications

1. Open your website chat
2. Enter name and email
3. Type: "I need to speak to someone"
4. Check your WhatsApp (ADMIN_WHATSAPP number)
5. You should receive a notification with customer details

### Test Scheduling Notifications

1. Click "Schedule Visit" in chat
2. Fill out the form
3. Submit
4. Check your WhatsApp
5. You should receive visit details

---

## Troubleshooting

### Not receiving WhatsApp messages

**Check:**
1. `WHATSAPP_ENABLED=true` in environment variables
2. Twilio credentials are correct
3. Your phone number is in E.164 format: `+1234567890`
4. You've joined the Twilio sandbox (send join code)
5. Check backend logs for errors

### WhatsApp button not showing in chat

**Check:**
1. `WHATSAPP_NUMBER` is set in environment variables
2. Frontend has been rebuilt and deployed
3. Browser console for errors

### Messages sending but not formatted correctly

- Check the `formatWhatsAppMessage` function in `src/utils/whatsapp.js`
- Adjust message templates as needed

---

## Production Deployment

### Moving from Sandbox to Production

1. **Apply for WhatsApp Business API**
   - Through Twilio or directly with Meta
   - Requires business verification
   - Takes 1-2 weeks

2. **Get Your Own Number**
   - Purchase a phone number
   - Or use existing business number
   - Configure in Twilio

3. **Update Message Templates**
   - WhatsApp requires pre-approved templates for business messages
   - Submit templates for approval
   - Update code to use approved templates

4. **Update Environment Variables**
   - Change `TWILIO_WHATSAPP_NUMBER` to your number
   - Format: `whatsapp:+1234567890`

---

## Cost Comparison

| Solution | Setup | Monthly Cost | Notifications |
|----------|-------|--------------|---------------|
| Twilio Sandbox | Easy | Free | ✅ Automatic |
| Twilio Production | Medium | ~$5-10 | ✅ Automatic |
| WhatsApp Business App | Easy | Free | ❌ Manual |
| Wassenger | Easy | $29 | ✅ Automatic |

**Recommendation:** Start with Twilio Sandbox (free), then upgrade to production if you get good usage.

---

## Alternative: Keep Email + Admin Panel

If WhatsApp seems too complex, you can stick with:
- Email notifications (already working)
- Admin panel PWA (install on phone)
- Both are free and work well

WhatsApp is optional but provides better mobile UX.
