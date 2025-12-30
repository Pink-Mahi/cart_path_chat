import dotenv from 'dotenv';

dotenv.config();

// Format: "9:00-17:00" (24-hour format)
const BUSINESS_HOURS_START = process.env.BUSINESS_HOURS_START || '9:00';
const BUSINESS_HOURS_END = process.env.BUSINESS_HOURS_END || '17:00';
const BUSINESS_DAYS = process.env.BUSINESS_DAYS || '1,2,3,4,5'; // Monday-Friday (0=Sunday, 6=Saturday)
const TIMEZONE = process.env.BUSINESS_TIMEZONE || 'America/New_York';

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isBusinessHours() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short'
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const minute = parseInt(parts.find(p => p.type === 'minute').value);
    const weekday = parts.find(p => p.type === 'weekday').value;

    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[weekday];
    const businessDays = BUSINESS_DAYS.split(',').map(Number);

    if (!businessDays.includes(currentDay)) {
      return false;
    }

    const currentMinutes = hour * 60 + minute;
    const startMinutes = parseTime(BUSINESS_HOURS_START);
    const endMinutes = parseTime(BUSINESS_HOURS_END);

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return true; // Default to open if error
  }
}

export function getAfterHoursMessage(lang = 'en') {
  if (lang === 'es') {
    return `Actualmente estamos fuera de línea. Nuestro horario de atención es de ${BUSINESS_HOURS_START} - ${BUSINESS_HOURS_END} (${TIMEZONE}). Deje un mensaje o solicite una llamada y nos comunicaremos con usted.`;
  }

  return `We're currently offline. Our business hours are ${BUSINESS_HOURS_START} - ${BUSINESS_HOURS_END} (${TIMEZONE}). Leave a message or request a call back, and we'll get back to you!`;
}
