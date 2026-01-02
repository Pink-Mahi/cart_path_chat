import { calculateCartPathPricing, milesToFeet, calculateSquareFootage } from './pricingCalculator.js';

console.log('=== Pricing Calculator Tests ===\n');

console.log('Test 1: Unit Conversions');
console.log('5 miles to feet:', milesToFeet(5), '(expected: 26,400)');
console.log('Square footage (26,400 ft × 5 ft):', calculateSquareFootage(26400, 5), '(expected: 132,000)\n');

console.log('Test 2: Customer Example from Screenshot');
console.log('Input: 5 miles long, 5 feet wide, very dirty condition');
const result = calculateCartPathPricing({
  length: 5,
  lengthUnit: 'miles',
  width: 5,
  condition: 'heavy'
});
console.log('Result:', JSON.stringify(result, null, 2));
console.log('Expected: 132,000 sq ft, $23,760-$31,680\n');

console.log('Test 3: Maintenance Contract Pricing');
const maintenanceResult = calculateCartPathPricing({
  length: 5,
  lengthUnit: 'miles',
  width: 5,
  condition: 'maintenance'
});
console.log('Result:', JSON.stringify(maintenanceResult, null, 2));
console.log('Expected: 132,000 sq ft, $18,480-$21,120\n');

console.log('Test 4: Moderate Condition (1-2 years)');
const moderateResult = calculateCartPathPricing({
  length: 5,
  lengthUnit: 'miles',
  width: 5,
  condition: 'moderate'
});
console.log('Result:', JSON.stringify(moderateResult, null, 2));
console.log('Expected: 132,000 sq ft, $21,120-$26,400\n');

console.log('Test 5: Feet Input (not miles)');
const feetResult = calculateCartPathPricing({
  length: 1000,
  lengthUnit: 'feet',
  width: 6,
  condition: 'heavy'
});
console.log('Result:', JSON.stringify(feetResult, null, 2));
console.log('Expected: 6,000 sq ft, $1,080-$1,440\n');
