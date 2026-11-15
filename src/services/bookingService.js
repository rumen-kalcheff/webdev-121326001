const bookingRepository = require('../data/bookingRepository');
const workstationRepository = require('../data/workstationRepository');
const { requireStaff } = require('./permissions');
const { assertBookableSlot, localDateString } = require('./slotRules');
const { NotFoundError, ConflictError, ForbiddenError } = require('./errors');

const BOOKING_LIMIT = 3;

// `now` is a parameter so the rules can be tested without the real clock.
function createBooking(userId, { workstationId, date, hour }, now = new Date()) {
  const workstation = workstationRepository.findById(workstationId);
  if (!workstation) {
    throw new NotFoundError('Workstation not found');
  }
  if (!workstation.in_service) {
    throw new ConflictError(`${workstation.name} is out of service`);
  }

  assertBookableSlot(date, hour, now);

  const today = localDateString(now);
  const currentHour = now.getHours();
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

// `user` is { id, role }: the owner of a booking and staff may cancel it, nobody else.
function cancelBooking(user, bookingId) {
  const booking = bookingRepository.findById(bookingId);
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  if (booking.user_id !== user.id && user.role !== 'staff') {
    throw new ForbiddenError('You can only cancel your own bookings');
  }
  bookingRepository.setStatus(booking.id, 'cancelled');
}

function listAllBookings(user) {
  requireStaff(user);
  return bookingRepository.findAll();
}

module.exports = { listAllBookings, createBooking, listMyBookings, cancelBooking };
