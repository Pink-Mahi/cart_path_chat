/**
 * Preprocesses text to make Piper TTS sound more natural
 * Based on best practices for neural TTS systems
 */

/**
 * Preprocesses text for more natural TTS output
 * @param {string} text - Raw text to be spoken
 * @returns {string} - Preprocessed text optimized for TTS
 */
export function preprocessTextForTTS(text) {
  if (!text || typeof text !== 'string') return text;

  let processed = text;

  // 1. Normalize whitespace
  processed = processed.replace(/\s+/g, ' ').trim();

  // 2. Add periods to sentences that don't have ending punctuation
  // This helps with natural pauses
  processed = processed.replace(/([a-z0-9])\s+([A-Z])/g, '$1. $2');

  // 3. Add commas before common conjunctions for natural pauses
  processed = processed.replace(/\s+(and|but|or|so)\s+/gi, ', $1 ');

  // 4. Ensure proper spacing after punctuation
  processed = processed.replace(/([.!?,:;])\s*/g, '$1 ');
  processed = processed.replace(/\s+/g, ' ');

  // 5. Add slight pause after introductory phrases
  const introductoryPhrases = [
    'However', 'Therefore', 'Additionally', 'Furthermore',
    'Meanwhile', 'Consequently', 'Nevertheless', 'Moreover',
    'First', 'Second', 'Third', 'Finally', 'Lastly',
    'For example', 'For instance', 'In fact', 'In addition'
  ];
  
  introductoryPhrases.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase}\\s+`, 'gi');
    processed = processed.replace(regex, `${phrase}, `);
  });

  // 6. Break very long sentences (over 150 chars) at natural points
  if (processed.length > 150) {
    // Add period before 'and' or 'but' in very long sentences
    processed = processed.replace(/([^.!?]{100,}),\s+(and|but)\s+/gi, '$1. $2 ');
  }

  // 7. Ensure sentence ends with punctuation
  if (!/[.!?]$/.test(processed)) {
    processed += '.';
  }

  // 8. Clean up any double punctuation
  processed = processed.replace(/([.!?])\1+/g, '$1');
  processed = processed.replace(/,\s*,/g, ',');

  // 9. Normalize ellipsis for consistent pauses
  processed = processed.replace(/\.{2,}/g, '...');

  // 10. Final cleanup
  processed = processed.replace(/\s+/g, ' ').trim();

  return processed;
}

/**
 * Splits long text into natural chunks for better TTS processing
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length per chunk (default 200)
 * @returns {string[]} - Array of text chunks
 */
export function splitTextForTTS(text, maxLength = 200) {
  if (!text || text.length <= maxLength) {
    return [preprocessTextForTTS(text)];
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk) {
      chunks.push(preprocessTextForTTS(currentChunk.trim()));
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(preprocessTextForTTS(currentChunk.trim()));
  }

  return chunks;
}

/**
 * Adds natural pauses to text for better pacing
 * @param {string} text - Text to enhance
 * @returns {string} - Text with added pauses
 */
export function addNaturalPauses(text) {
  let processed = text;

  // Add slight pause after greetings
  processed = processed.replace(/^(Hi|Hello|Hey|Greetings|Good morning|Good afternoon|Good evening)[,\s]*/i, '$1. ');

  // Add pause after questions before answers
  processed = processed.replace(/\?\s*([A-Z])/g, '? ... $1');

  // Add pause before important transitions
  processed = processed.replace(/\.\s*(Here's|Here are|This|These|That|Those)\s/gi, '. ... $1 ');

  return processed;
}
