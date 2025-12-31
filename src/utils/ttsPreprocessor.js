/**
 * Preprocesses text to make Piper TTS sound more natural
 * Based on best practices for neural TTS systems
 */

/**
 * Converts numbers to words (NeMo-inspired implementation)
 * @param {number} num - Number to convert
 * @returns {string} - Number as words
 */
function numberToWords(num) {
  if (num === 0) return 'zero';
  
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one ? '-' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return ones[hundred] + ' hundred' + (rest ? ' ' + numberToWords(rest) : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    return numberToWords(thousand) + ' thousand' + (rest ? ' ' + numberToWords(rest) : '');
  }
  if (num < 1000000000) {
    const million = Math.floor(num / 1000000);
    const rest = num % 1000000;
    return numberToWords(million) + ' million' + (rest ? ' ' + numberToWords(rest) : '');
  }
  
  return num.toString(); // Fallback for very large numbers
}

/**
 * Converts numbers to spoken text (NeMo-inspired normalization)
 * @param {string} text - Text containing numbers
 * @returns {string} - Text with numbers converted to words
 */
function normalizeNumbers(text) {
  let processed = text;

  // Currency with cents - $42,500.56 -> "forty-two thousand five hundred dollars and fifty-six cents"
  processed = processed.replace(/\$([0-9,]+)\.(\d{2})/g, (match, dollars, cents) => {
    const dollarNum = parseInt(dollars.replace(/,/g, ''));
    const centsNum = parseInt(cents);
    const dollarWords = numberToWords(dollarNum);
    if (centsNum === 0) {
      return `${dollarWords} dollars`;
    }
    const centsWords = numberToWords(centsNum);
    return `${dollarWords} dollars and ${centsWords} cents`;
  });

  // Currency without cents - $42,500 -> "forty-two thousand five hundred dollars"
  processed = processed.replace(/\$([0-9,]+)(?!\.\d)/g, (match, amount) => {
    const num = parseInt(amount.replace(/,/g, ''));
    return `${numberToWords(num)} dollars`;
  });

  // Temperature - 72F or 72°F -> "72 degrees Fahrenheit"
  processed = processed.replace(/(\d+)\s*°?F\b/gi, '$1 degrees Fahrenheit');
  processed = processed.replace(/(\d+)\s*°?C\b/gi, '$1 degrees Celsius');

  // Percentages - 25% -> "25 percent"
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent');

  // Phone numbers - (555) 123-4567 -> "5 5 5, 1 2 3, 4 5 6 7"
  processed = processed.replace(/\((\d{3})\)\s*(\d{3})-(\d{4})/g, (match, area, prefix, line) => {
    return `${area.split('').join(' ')}, ${prefix.split('').join(' ')}, ${line.split('').join(' ')}`;
  });

  // Years - 2024 -> "twenty twenty-four" (when clearly a year)
  processed = processed.replace(/\b(19|20)(\d{2})\b/g, (match, century, year) => {
    const centuryNum = parseInt(century + '00');
    const yearNum = parseInt(year);
    if (yearNum === 0) {
      return `${centuryNum}`;
    }
    return `${century} ${year}`;
  });

  // Large numbers with commas - 42,500 -> "42 thousand 500"
  processed = processed.replace(/\b(\d{1,3}),(\d{3}),(\d{3})\b/g, '$1 million $2 thousand $3');
  processed = processed.replace(/\b(\d{1,3}),(\d{3})\b/g, '$1 thousand $2');

  // Decimals - 3.14 -> "3 point 1 4"
  processed = processed.replace(/\b(\d+)\.(\d+)\b/g, (match, whole, decimal) => {
    return `${whole} point ${decimal.split('').join(' ')}`;
  });

  // Ordinals - 1st, 2nd, 3rd, 4th -> "first, second, third, fourth"
  const ordinals = {
    '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth',
    '5th': 'fifth', '6th': 'sixth', '7th': 'seventh', '8th': 'eighth',
    '9th': 'ninth', '10th': 'tenth', '11th': 'eleventh', '12th': 'twelfth',
    '13th': 'thirteenth', '14th': 'fourteenth', '15th': 'fifteenth',
    '16th': 'sixteenth', '17th': 'seventeenth', '18th': 'eighteenth',
    '19th': 'nineteenth', '20th': 'twentieth', '21st': 'twenty-first',
    '22nd': 'twenty-second', '23rd': 'twenty-third', '30th': 'thirtieth',
    '31st': 'thirty-first'
  };
  
  Object.keys(ordinals).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    processed = processed.replace(regex, ordinals[key]);
  });

  // Time - 3:30pm -> "3 30 PM"
  processed = processed.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/gi, '$1 $2 $3');

  // Measurements
  processed = processed.replace(/(\d+)\s*ft\b/gi, '$1 feet');
  processed = processed.replace(/(\d+)\s*in\b/gi, '$1 inches');
  processed = processed.replace(/(\d+)\s*lb\b/gi, '$1 pounds');
  processed = processed.replace(/(\d+)\s*oz\b/gi, '$1 ounces');
  processed = processed.replace(/(\d+)\s*mph\b/gi, '$1 miles per hour');
  processed = processed.replace(/(\d+)\s*km\b/gi, '$1 kilometers');
  processed = processed.replace(/(\d+)\s*mi\b/gi, '$1 miles');

  return processed;
}

/**
 * Preprocesses text for more natural TTS output
 * @param {string} text - Raw text to be spoken
 * @returns {string} - Preprocessed text optimized for TTS
 */
export function preprocessTextForTTS(text) {
  if (!text || typeof text !== 'string') return text;

  let processed = text;

  // 1. Remove or normalize punctuation that TTS might read literally
  // Replace multiple exclamation marks with period (excitement is in the tone, not the symbol)
  processed = processed.replace(/!+/g, '.');
  // Remove asterisks (often used for emphasis in text but not needed for speech)
  processed = processed.replace(/\*/g, '');

  // 2. Normalize numbers, currency, and units
  processed = normalizeNumbers(processed);

  // 3. Normalize whitespace
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
