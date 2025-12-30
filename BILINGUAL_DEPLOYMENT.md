# Bilingual System Deployment Guide

## Overview
Complete bilingual English/Spanish chat system with automatic translation.

---

## ✅ What's Been Implemented

### Frontend (Website)
- ✅ Language toggle in header (EN | ES)
- ✅ Hero section translates instantly
- ✅ Navigation menu translates
- ✅ Chat widget UI translates
- ✅ Language preference sent to server

### Backend (Chat Server)
- ✅ Automatic language detection
- ✅ Spanish → English translation for AI processing
- ✅ English → Spanish translation for customer responses
- ✅ Appropriate TTS voices (Spanish/English)
- ✅ Admin messages auto-translate to customer's language

---

## 🚀 Deployment Steps

### 1. Deploy Frontend (cart_path)
```bash
# In Coolify, deploy cart_path
# Latest commit: 9fbd76a
```

### 2. Deploy Backend (cart_path_chat)
```bash
# In Coolify, deploy cart_path_chat
# Latest commit: f724f59
```

### 3. Run Database Migration

**IMPORTANT: Run this in the Postgres container, NOT the app container!**

```bash
# 1. Open Coolify Terminal for cart_path_chat_db (Postgres container)

# 2. Start psql
psql -U postgres

# 3. Run migration (copy/paste entire block)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_language VARCHAR(10) DEFAULT 'en';

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS original_content TEXT,
ADD COLUMN IF NOT EXISTS translated_content TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_language ON conversations(customer_language);
CREATE INDEX IF NOT EXISTS idx_messages_language ON messages(language);

UPDATE messages SET language = 'en' WHERE language IS NULL;
UPDATE conversations SET customer_language = 'en' WHERE customer_language IS NULL;

# 4. Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND column_name = 'customer_language';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('language', 'original_content', 'translated_content');

# 5. Exit psql
\q
```

---

## 🎯 How It Works

### Customer Experience (Spanish Speaker)

1. **Visits website** → Clicks EN | ES toggle → Selects **ES**
2. **Opens chat** → Everything in Spanish
3. **Types message in Spanish:** "Hola, necesito información sobre limpieza"
4. **System:**
   - Stores Spanish message
   - Translates to English for AI: "Hello, I need information about cleaning"
   - AI processes English version
   - AI responds in English: "I'd be happy to help..."
   - Translates to Spanish: "Estaría encantado de ayudar..."
   - Customer sees Spanish response
   - Spanish TTS voice speaks response

### Admin Experience

1. **Opens dashboard** → Sees conversation
2. **Sees customer message:** "Hola, necesito información..." (Spanish original)
3. **Types reply in English:** "We can schedule a visit next week"
4. **System:**
   - Stores English message
   - Translates to Spanish: "Podemos programar una visita..."
   - Customer receives Spanish version
   - Admin always sees English

---

## 🧪 Testing Checklist

### Website Translation
- [ ] Toggle EN | ES in header
- [ ] Hero text changes language
- [ ] Navigation changes language
- [ ] Preference persists on refresh

### Chat Translation
- [ ] Open chat widget
- [ ] Website language affects chat language
- [ ] Type Spanish message → Bot responds in Spanish
- [ ] Type English message → Bot responds in English
- [ ] Admin reply translates to customer's language

### Admin Dashboard
- [ ] Spanish customer messages visible
- [ ] Admin can reply in English
- [ ] Customer receives Spanish translation

---

## 💰 Cost Estimate

**OpenAI Translation (GPT-3.5-turbo):**
- ~$0.0005 per message translation
- Example: 100 Spanish messages/day = $0.05/day = $1.50/month
- Very affordable for the value provided

**Piper TTS:**
- Self-hosted, no additional cost
- Spanish voices already configured

---

## 🔧 Troubleshooting

### Migration fails
- Make sure you're in the **Postgres container**, not the app container
- Look for `postgres=#` prompt, not `/#` or `/app #`

### Translations not working
- Check OpenAI API key is set in environment variables
- Check server logs for translation errors
- Verify customer_language column exists in conversations table

### Spanish TTS not working
- Verify Piper TTS server has Spanish voices installed
- Check voice name: `es_ES-mls_10246-low` (female) or `es_ES-mls_9972-low` (male)

---

## 📊 Database Schema Changes

### conversations table
```sql
customer_language VARCHAR(10) DEFAULT 'en'  -- 'en' or 'es'
```

### messages table
```sql
language VARCHAR(10) DEFAULT 'en'           -- Language of the message
original_content TEXT                        -- Original text before translation
translated_content TEXT                      -- Translated version
```

---

## 🎉 Success Criteria

✅ Spanish-speaking customers can use entire website in Spanish
✅ Chat automatically translates Spanish ↔ English
✅ Admin always sees English, types English
✅ Customers receive responses in their language
✅ Appropriate TTS voices for each language
✅ Language preference persists across sessions

---

## Next Steps (Optional Enhancements)

1. Add more languages (French, Portuguese, etc.)
2. Add language indicator badge on conversations in admin dashboard
3. Show both Spanish and English versions in admin chat view
4. Add translation toggle in admin dashboard to see original text

---

**Deployment Date:** December 30, 2024
**Total Commits:** 17 (TTS improvements, SEO, Bilingual system)
