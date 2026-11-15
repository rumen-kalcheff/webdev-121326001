const assert = require('node:assert/strict');
const db = require('../src/data/db');
const { applySchemaAndSeed } = require('../db/init');
const bookingService = require('../src/services/bookingService');
const { NotFoundError, ValidationError, ConflictError, ForbiddenError } = require('../src/services/errors');

// "Now" is fixed so the tests do not depend on the real clock: 2030-01-10, 09:00 local time.
const NOW = new Date(2030, 0, 10, 9, 0, 0);
const FUTURE = '2030-01-15';

describe('Slice 2: booking service rules', () => {
  let studentId;
  let otherStudentId;

  beforeEach(() => {
    applySchemaAndSeed(db);
    db.prepare('DELETE FROM bookings').run();
    studentId = db.prepare("SELECT id FROM users WHERE email = 'student@example.com'").get().id;
    db.prepare("DELETE FROM users WHERE email = 'other@example.com'").run();
    otherStudentId = db
      .prepare("INSERT INTO users (email, password_hash, role) VALUES ('other@example.com', 'x', 'student')")
      .run().lastInsertRowid;
  });

  const bookingRows = () => db.prepare('SELECT * FROM bookings').all();

  it('AC-1 a second booking of the same workstation, day and hour is refused with "This slot is taken" and adds no row', () => {
    bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);

    assert.throws(
      () => bookingService.createBooking(otherStudentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW),
      (err) => err instanceof ConflictError && err.message === 'This slot is taken'
    );
    assert.equal(bookingRows().length, 1);
  });

  it('AC-1 the same hour on a different workstation is still free', () => {
    bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);
    bookingService.createBooking(otherStudentId, { workstationId: 2, date: FUTURE, hour: 10 }, NOW);
    assert.equal(bookingRows().length, 2);
  });

  it('AC-5 a booking for a past day is refused and adds no row', () => {
    assert.throws(
      () => bookingService.createBooking(studentId, { workstationId: 1, date: '2030-01-09', hour: 10 }, NOW),
      (err) => err instanceof ValidationError && err.message === 'You cannot book a time in the past'
    );
    assert.equal(bookingRows().length, 0);
  });

  it('AC-5 an hour that already began today is refused, the next hour is allowed', () => {
    assert.throws(
      () => bookingService.createBooking(studentId, { workstationId: 1, date: '2030-01-10', hour: 8 }, NOW),
      (err) => err instanceof ValidationError && err.message === 'You cannot book a time in the past'
    );
    bookingService.createBooking(studentId, { workstationId: 1, date: '2030-01-10', hour: 10 }, NOW);
    assert.equal(bookingRows().length, 1);
  });

  it('AC-6 a fourth active future booking is refused with "Booking limit reached (3)" and adds no row', () => {
    [10, 11, 12].forEach((hour) => {
      bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour }, NOW);
    });

    assert.throws(
      () => bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 13 }, NOW),
      (err) => err instanceof ConflictError && err.message === 'Booking limit reached (3)'
    );
    assert.equal(bookingRows().length, 3);
  });

  it('AC-6 cancelled bookings and other people\'s bookings do not count towards the limit', () => {
    [10, 11, 12].forEach((hour) => {
      bookingService.createBooking(otherStudentId, { workstationId: 1, date: FUTURE, hour }, NOW);
    });
    db.prepare("INSERT INTO bookings (user_id, workstation_id, date, hour, status) VALUES (?, 2, ?, 9, 'cancelled')")
      .run(studentId, FUTURE);

    bookingService.createBooking(studentId, { workstationId: 3, date: FUTURE, hour: 10 }, NOW);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE user_id = ?').get(studentId).n, 2);
  });

  it('AC-15 a workstation that does not exist is refused with NotFound and adds no row', () => {
    assert.throws(
      () => bookingService.createBooking(studentId, { workstationId: 99999, date: FUTURE, hour: 10 }, NOW),
      (err) => err instanceof NotFoundError
    );
    assert.equal(bookingRows().length, 0);
  });

  [7, 20, 10.5, 'ten'].forEach((hour) => {
    it(`AC-16 hour ${JSON.stringify(hour)} is refused with a sentence naming the allowed hours`, () => {
      assert.throws(
        () => bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour }, NOW),
        (err) => err instanceof ValidationError && /08:00-20:00/.test(err.message)
      );
      assert.equal(bookingRows().length, 0);
    });
  });

  ['2030-13-45', 'tomorrow', undefined].forEach((date) => {
    it(`AC-16 date ${JSON.stringify(date)} that is not a real day is refused with a sentence and adds no row`, () => {
      assert.throws(
        () => bookingService.createBooking(studentId, { workstationId: 1, date, hour: 10 }, NOW),
        (err) => err instanceof ValidationError && /date/.test(err.message)
      );
      assert.equal(bookingRows().length, 0);
    });
  });

  it('AC-17 when two requests pass the check at the same moment, the loser gets "This slot is taken"', () => {
    const repo = require('../src/data/bookingRepository');
    const original = repo.findActiveBySlot;
    // Simulate the race: the check sees a free slot, but the other request's row is already in.
    repo.findActiveBySlot = () => undefined;
    try {
      bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);
      assert.throws(
        () => bookingService.createBooking(otherStudentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW),
        (err) => err instanceof ConflictError && err.message === 'This slot is taken'
      );
    } finally {
      repo.findActiveBySlot = original;
    }
    assert.equal(bookingRows().length, 1);
  });

  it('AC-17 the database itself refuses a second active row for the same workstation, day and hour', () => {
    const insert = db.prepare("INSERT INTO bookings (user_id, workstation_id, date, hour, status) VALUES (?, 1, ?, 10, ?)");
    insert.run(studentId, FUTURE, 'active');

    assert.throws(() => insert.run(otherStudentId, FUTURE, 'active'), /UNIQUE/);
    insert.run(otherStudentId, FUTURE, 'cancelled');
    assert.equal(bookingRows().length, 2);
  });
  describe('cancelBooking', () => {
    const rowOf = (id) => db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

    it('AC-3 the owner cancels their booking and its row gets status cancelled', () => {
      const booking = bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);
      bookingService.cancelBooking({ id: studentId, role: 'student' }, booking.id);
      assert.equal(rowOf(booking.id).status, 'cancelled');
      assert.equal(bookingService.listMyBookings(studentId).length, 0);
    });

    it('AC-3 a cancelled slot can be booked again', () => {
      const booking = bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);
      bookingService.cancelBooking({ id: studentId, role: 'student' }, booking.id);
      bookingService.createBooking(otherStudentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);
      assert.equal(bookingRows().filter((r) => r.status === 'active').length, 1);
    });

    it('AC-4 a student who cancels another student\'s booking is refused and the row is unchanged', () => {
      const booking = bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);
      const before = rowOf(booking.id);
      assert.throws(
        () => bookingService.cancelBooking({ id: otherStudentId, role: 'student' }, booking.id),
        (err) => err instanceof ForbiddenError && err.message === 'You can only cancel your own bookings'
      );
      assert.deepEqual(rowOf(booking.id), before);
    });

    it('AC-4 a staff member may cancel any booking', () => {
      const booking = bookingService.createBooking(studentId, { workstationId: 1, date: FUTURE, hour: 10 }, NOW);
      bookingService.cancelBooking({ id: otherStudentId, role: 'staff' }, booking.id);
      assert.equal(rowOf(booking.id).status, 'cancelled');
    });

    it('AC-4 cancelling a booking that does not exist is refused with NotFound', () => {
      assert.throws(
        () => bookingService.cancelBooking({ id: studentId, role: 'student' }, 99999),
        (err) => err instanceof NotFoundError
      );
    });
  });
});
