# Deployment Guide - Cart Path Chat Backend

## Backend Deployment on Coolify

### 1. Push to GitHub

```bash
cd "c:/Users/jpyad.JON-DESKTOP.000/Desktop/cart_path_chat"
git init
git add .
git commit -m "Initial commit - AI chat backend"
git branch -M main
git remote add origin https://github.com/Pink-Mahi/cart_path_chat.git
git push -u origin main
```

### 2. Create PostgreSQL Database in Coolify

1. Go to Coolify dashboard
2. Click **+ New Resource** → **Database** → **PostgreSQL**
3. Name: `cart_path_chat_db`
4. Click **Create**
5. Copy the **Internal Connection String** (looks like: `postgresql://user:pass@host:5432/dbname`)

### 3. Deploy Backend Application

1. Click **+ New Resource** → **Application**
2. **Source**: GitHub
3. **Repository**: `Pink-Mahi/cart_path_chat`
4. **Branch**: `main`
5. **Build Pack**: `Dockerfile`
6. **Port**: `3001`

### 4. Configure Environment Variables

Add these in Coolify application settings:

```
PORT=3001
DATABASE_URL=<paste-postgresql-connection-string-from-step-2>
OPENAI_API_KEY=<your-openai-api-key>
FRONTEND_URL=https://cartpathcleaning.com
ADMIN_EMAIL=<your-email>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail>
SMTP_PASS=<your-gmail-app-password>
NODE_ENV=production
```

**Gmail App Password Setup:**
1. Go to Google Account → Security
2. Enable 2-Factor Authentication
3. Go to App Passwords
4. Generate password for "Mail"
5. Use that password in `SMTP_PASS`

### 5. Set Domain

1. In Coolify app settings → **Domains**
2. Add: `chat-api.cartpathcleaning.com` (or your preferred subdomain)
3. Enable **Let's Encrypt SSL**

### 6. Deploy

1. Click **Deploy** button
2. Watch logs for any errors
3. Once deployed, run database migration

### 7. Run Database Migration

In Coolify, go to **Terminal** tab and run:

```bash
node src/db/migrate.js
```

You should see: `✓ Database migrations completed successfully`

### 8. Test Backend

Visit: `https://chat-api.cartpathcleaning.com/health`

Should return:
```json
{"status":"ok","timestamp":"..."}
```

### 9. Access Admin Panel

Visit: `https://chat-api.cartpathcleaning.com/admin.html`

**Install as PWA (optional):**
- On mobile: Tap browser menu → "Add to Home Screen"
- On desktop: Look for install icon in address bar

---

## Frontend Integration

### 1. Update Frontend Environment Variable

In your `cart path cleaning` repo, create/update `.env`:

```
VITE_CHAT_API_URL=https://chat-api.cartpathcleaning.com
```

### 2. Rebuild and Deploy Frontend

```bash
cd "c:/Users/jpyad.JON-DESKTOP.000/Desktop/cart path cleaning"
git add .
git commit -m "Add AI chat widget"
git push origin main
```

Coolify will auto-deploy the updated frontend.

---

## Testing the Chat System

1. Visit `https://cartpathcleaning.com`
2. Click chat bubble in bottom-right
3. Enter name and email
4. Ask a question like: "What areas do you service?"
5. AI should respond automatically

### Test Admin Panel

1. Open `https://chat-api.cartpathcleaning.com/admin.html`
2. You should see the conversation
3. Click to open and reply
4. Reply will appear in customer's chat widget

### Test Email Notifications

Ask the bot: "I need to speak to someone"

You should receive an email at `ADMIN_EMAIL` with a link to the conversation.

---

## Troubleshooting

### Chat widget not connecting

- Check browser console for errors
- Verify `VITE_CHAT_API_URL` is correct
- Ensure backend is running (check `/health` endpoint)
- Check CORS settings in backend

### Database errors

- Verify `DATABASE_URL` is correct
- Run migration again: `node src/db/migrate.js`
- Check PostgreSQL logs in Coolify

### Email not sending

- Verify Gmail App Password is correct
- Check SMTP settings
- Look for errors in backend logs

### OpenAI errors

- Verify API key is valid
- Check OpenAI account has credits
- Look for rate limit errors in logs

---

## Monitoring

### View Logs

In Coolify:
- Go to your chat backend app
- Click **Logs** tab
- Watch for errors or connection issues

### Check Conversations

Visit admin panel regularly to see:
- New conversations
- Messages requiring human response
- Customer questions/patterns

---

## Cost Estimates

### OpenAI API (GPT-4 Turbo)

- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens
- Average chat: ~500 tokens = $0.02
- 100 chats/month = **$2/month**

### Coolify Hosting

- Already included in your server costs
- PostgreSQL: minimal resources needed

### Total: ~$2-5/month

---

## Next Steps

1. Monitor first conversations
2. Adjust AI prompts in `src/ai/openai.js` based on customer questions
3. Add more FAQs to system prompt
4. Consider adding chat history to customer accounts
5. Set up analytics to track chat usage

---

## Support

If you encounter issues:
1. Check Coolify logs
2. Test `/health` endpoint
3. Verify all environment variables
4. Check PostgreSQL connection
