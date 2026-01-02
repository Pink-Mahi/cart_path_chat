/**
 * Pricing Calculator Utility
 * Provides accurate pricing calculations for cart path cleaning quotes
 */

/**
 * Convert miles to feet
 * @param {number} miles - Distance in miles
 * @returns {number} Distance in feet
 */
export function milesToFeet(miles) {
  return miles * 5280;
}

/**
 * Calculate square footage from length and width
 * @param {number} length - Length in feet
 * @param {number} width - Width in feet
 * @returns {number} Area in square feet
 */
export function calculateSquareFootage(length, width) {
  return length * width;
}

/**
 * Calculate pricing estimate based on square footage and condition
 * @param {number} squareFootage - Total square footage
 * @param {string} condition - Path condition: 'maintenance', 'moderate', or 'heavy'
 * @returns {object} Pricing estimate with low and high range
 */
export function calculatePricing(squareFootage, condition = 'moderate') {
  let ratePerSqFt = { low: 0.16, high: 0.20 }; // Default moderate range

  switch (condition.toLowerCase()) {
    case 'maintenance':
    case 'recently cleaned':
    case 'recent':
      // For ongoing maintenance contracts
      ratePerSqFt = { low: 0.14, high: 0.16 };
      break;
    case 'moderate':
    case '1-2 years':
    case '1-2 years ago':
      // Mid-range for paths cleaned 1-2 years ago
      ratePerSqFt = { low: 0.16, high: 0.20 };
      break;
    case 'heavy':
    case 'very dirty':
    case '3+ years':
    case 'never':
    case 'never cleaned':
      // Higher rate for heavily soiled paths
      ratePerSqFt = { low: 0.18, high: 0.24 };
      break;
    default:
      // Default to moderate
      ratePerSqFt = { low: 0.16, high: 0.20 };
  }

  const lowEstimate = Math.round(squareFootage * ratePerSqFt.low);
  const highEstimate = Math.round(squareFootage * ratePerSqFt.high);

  return {
    squareFootage,
    ratePerSqFt,
    lowEstimate,
    highEstimate,
    formattedRange: `$${lowEstimate.toLocaleString()}-$${highEstimate.toLocaleString()}`
  };
}

/**
 * Main pricing calculator function that handles all conversions and calculations
 * @param {object} params - Calculation parameters
 * @param {number} params.length - Path length (in feet or miles)
 * @param {string} params.lengthUnit - Unit of length: 'feet' or 'miles'
 * @param {number} params.width - Path width in feet
 * @param {string} params.condition - Path condition: 'maintenance', 'moderate', or 'heavy'
 * @returns {object} Complete pricing breakdown
 */
export function calculateCartPathPricing({ length, lengthUnit = 'feet', width, condition = 'moderate' }) {
  // Convert length to feet if needed
  const lengthInFeet = lengthUnit.toLowerCase() === 'miles' ? milesToFeet(length) : length;
  
  // Calculate square footage
  const squareFootage = calculateSquareFootage(lengthInFeet, width);
  
  // Calculate pricing
  const pricing = calculatePricing(squareFootage, condition);
  
  return {
    input: {
      length,
      lengthUnit,
      lengthInFeet,
      width,
      condition
    },
    ...pricing
  };
}
