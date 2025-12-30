# Bilingual Chat Implementation Plan

## Overview
Add English/Spanish language toggle to chat widget with automatic translation.

## User Experience

### Customer Side (Chat Widget)
- Language toggle button (🌐 EN | ES) in chat header
- Customer can switch languages anytime
- All messages (bot, admin, system) appear in selected language
- Language preference saved in localStorage
- TTS uses appropriate voice for selected language

### Admin Side (Dashboard)
- Always see English
- Spanish messages show: "Spanish: [original]" + English translation
- Admin types in English, auto-translates to customer's language
- Language indicator badge on conversations

## Technical Implementation

### 1. Database Schema (DONE)
- `conversations.customer_language` - stores customer's language preference
- `messages.language` - language of the message
- `messages.original_content` - original text before translation
- `messages.translated_content` - translated version

### 2. Translation Service (DONE)
- `src/utils/translator.js` - OpenAI-based translation
- Functions: detectLanguage, translateText, translateToSpanish, translateToEnglish
- Spanish TTS voices: es_ES-mls_10246-low (female), es_ES-mls_9972-low (male)

### 3. Chat Widget Updates (TODO)
- Add language state and toggle button
- Send language preference with messages
- Display messages in selected language
- Update TTS to use language-appropriate voice

### 4. Server Updates (TODO)
- Detect/store customer language preference
- Translate customer messages to English for AI processing
- Translate bot/admin responses to customer's language
- Store both original and translated versions

### 5. Admin Dashboard Updates (TODO)
- Show language indicator on conversations
- Display Spanish messages with English translation
- Show "(Translated to Spanish)" indicator on admin replies

## Implementation Steps

1. ✅ Create translation utility
2. ✅ Create database migration
3. ⏳ Update chat widget with language toggle
4. ⏳ Update server message handling
5. ⏳ Update admin dashboard display
6. ⏳ Run database migration
7. ⏳ Test end-to-end

## Translation Flow Examples

### Customer sends Spanish message:
1. Customer: "Hola, necesito información" (Spanish)
2. Server stores: original="Hola...", language="es"
3. Server translates to English: "Hello, I need information"
4. AI processes English version
5. AI responds in English: "I'd be happy to help..."
6. Server translates to Spanish: "Estaría encantado de ayudar..."
7. Customer sees Spanish, Admin sees English

### Admin replies:
1. Admin types: "We can schedule a visit next week"
2. Server stores: original="We can...", language="en"
3. Server translates to Spanish: "Podemos programar una visita..."
4. Customer sees Spanish, Admin sees English

## Notes
- Translation uses OpenAI GPT-3.5-turbo (fast, cost-effective)
- Fallback: If translation fails, show original language
- Future: Add more languages by updating translator.js
