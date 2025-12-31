import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Detects the language of the given text
 * @param {string} text - Text to analyze
 * @returns {Promise<string>} - Language code (en, es, etc.)
 */
export async function detectLanguage(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a language detector. Respond with ONLY the two-letter ISO language code (en, es, fr, etc.). No explanation.'
        },
        {
          role: 'user',
          content: `Detect the language of this text: "${text}"`
        }
      ],
      temperature: 0,
      max_tokens: 10
    });

    const language = response.choices[0].message.content.trim().toLowerCase();
    return language;
  } catch (error) {
    console.error('Language detection failed:', error);
    return 'en'; // Default to English
  }
}

/**
 * Translates text from one language to another
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (en, es, etc.)
 * @param {string} sourceLang - Source language code (optional)
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang, sourceLang = null) {
  try {
    const sourceHint = sourceLang ? ` from ${sourceLang}` : '';
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the text${sourceHint} to ${targetLang}. Maintain the tone and style. Respond with ONLY the translation, no explanations or notes.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Translation failed:', error);
    return text; // Return original text if translation fails
  }
}

/**
 * Translates text to Spanish
 * @param {string} text - English text to translate
 * @returns {Promise<string>} - Spanish translation
 */
export async function translateToSpanish(text) {
  return translateText(text, 'es', 'en');
}

/**
 * Translates text to English
 * @param {string} text - Text to translate to English
 * @returns {Promise<string>} - English translation
 */
export async function translateToEnglish(text) {
  return translateText(text, 'en');
}

/**
 * Gets the appropriate TTS voice for a language
 * @param {string} language - Language code (en, es, etc.)
 * @param {string} gender - 'male' or 'female'
 * @returns {string} - Piper voice name
 */
export function getTTSVoice(language, gender = 'female') {
  const voices = {
    en: {
      female: 'en_US-lessac-medium',
      male: 'en_US-danny-low'
    },
    es: {
      female: 'es_ES-mls_10246-low',
      male: 'es_ES-mls_9972-low'
    }
  };

  return voices[language]?.[gender] || voices.en[gender];
}
