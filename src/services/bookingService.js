const bookingRepository = require('../data/bookingRepository');
const workstationRepository = require('../data/workstationRepository');
const { ValidationError, NotFoundError, ConflictError } = require('./errors');

const FIRST_HOUR = 8;
const LAST_HOUR = 19; // the last slot starts at 19:00 and ends at 20:00
const BOOKING_LIMIT = 3;

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

// `now` is a parameter so the rules can be tested without the real clock.
function createBooking(userId, { workstationId, date, hour }, now = new Date()) {
  if (!workstationRepository.findById(workstationId)) {
    throw new NotFoundError('Workstation not found');
  }

  if (!Number.isInteger(hour) || hour < FIRST_HOUR || hour > LAST_HOUR) {
    throw new ValidationError('Bookings are whole hours between 08:00-20:00');
  }
  if (!isRealDate(date)) {
    throw new ValidationError('The date must look like 2030-01-31');
  }

  const today = localDateString(now);
  const currentHour = now.getHours();
  if (date < today || (date === today && hour <= currentHour)) {
    throw new ValidationError('You cannot book a time in the past');
  }

  if (bookingRepository.countActiveFromSlot(userId, today, currentHour + 1) >= BOOKING_LIMIT) {
    throw new ConflictError(`Booking limit reached (${BOOKING_LIMIT})`);
  }

  if (bookingRepository.findActiveBySlot(workstationId, date, hour)) {
    throw new ConflictError('This slot is taken');
  }

  try {
    return bookingRepository.insert(userId, workstationId, date, hour);
  } catch (err) {
    // Two requests at the same moment: the unique index lets only one through.
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new ConflictError('This slot is taken');
    }
    throw err;
  }
}

function listMyBookings(userId) {
  return bookingRepository.findActiveByUser(userId);
}

module.exports = { createBooking, listMyBookings };
