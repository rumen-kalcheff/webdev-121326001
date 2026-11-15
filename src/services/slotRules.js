const { ValidationError } = require('./errors');

const FIRST_HOUR = 8;
const LAST_HOUR = 19; // the last slot starts at 19:00 and ends at 20:00

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
}

// The one place that says which day and hour may be booked. Booking a slot and
// checking the assistant's suggestion both call it, so the two can never disagree.
function assertBookableSlot(date, hour, now) {
  if (!Number.isInteger(hour) || hour < FIRST_HOUR || hour > LAST_HOUR) {
    throw new ValidationError('Bookings are whole hours between 08:00-20:00');
  }
  if (!isRealDate(date)) {
    throw new ValidationError('The date must look like 2030-01-31');
  }
  if (date < localDateString(now) || (date === localDateString(now) && hour <= now.getHours())) {
    throw new ValidationError('You cannot book a time in the past');
  }
}

module.exports = { assertBookableSlot, localDateString };
