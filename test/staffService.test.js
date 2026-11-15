const assert = require('node:assert/strict');
const db = require('../src/data/db');
const { resetDb } = require('./helpers');
const bookingService = require('../src/services/bookingService');
const labService = require('../src/services/labService');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../src/services/errors');

const NOW = new Date(2030, 0, 10, 9, 0, 0);
const FUTURE = '2030-01-15';

describe('Slice 3: staff rules in the services', () => {
  let student;
  let staff;
  let w1;
  let w2;

  beforeEach(() => {
    resetDb();
    db.prepare('DELETE FROM bookings').run();
    db.prepare("DELETE FROM labs WHERE name = 'New Lab'").run();
    db.prepare('UPDATE workstations SET in_service = 1').run();
    student = db.prepare("SELECT id, role FROM users WHERE email = 'student@example.com'").get();
    staff = db.prepare("SELECT id, role FROM users WHERE email = 'staff@example.com'").get();
    [w1, w2] = db.prepare('SELECT id FROM workstations ORDER BY id LIMIT 2').all().map((w) => w.id);
  });

  describe('AC-7 all bookings', () => {
    it('AC-7 a staff member sees the bookings of every student with lab, workstation, hour and status', () => {
      bookingService.createBooking(student.id, { workstationId: w1, date: FUTURE, hour: 10 }, NOW);
      bookingService.createBooking(staff.id, { workstationId: w2, date: FUTURE, hour: 11 }, NOW);
      const all = bookingService.listAllBookings(staff);
      assert.equal(all.length, 2);
      assert.deepEqual(Object.keys(all[0]).sort(), ['date', 'email', 'hour', 'id', 'lab', 'status', 'workstation']);
    });

    it('AC-7 a student who asks for all bookings is refused with ForbiddenError', () => {
      assert.throws(() => bookingService.listAllBookings(student), ForbiddenError);
    });
  });

  describe('AC-8 add a lab', () => {
    const labCount = () => db.prepare('SELECT COUNT(*) AS n FROM labs').get().n;

    it('AC-8 a staff member adds a lab: one new labs row and as many workstations as announced', () => {
      const before = labCount();
      const lab = labService.addLab(staff, { name: 'New Lab', room: 'Room 303', workstationCount: 4 });
      assert.equal(labCount(), before + 1);
      assert.equal(lab.name, 'New Lab');
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM workstations WHERE lab_id = ?').get(lab.id).n, 4);
      assert.ok(labService.getAllLabs().some((l) => l.name === 'New Lab'));
    });

    it('AC-8 a student who adds a lab is refused with ForbiddenError and no row is added', () => {
      const before = labCount();
      assert.throws(() => labService.addLab(student, { name: 'New Lab', room: 'Room 303', workstationCount: 4 }), ForbiddenError);
      assert.equal(labCount(), before);
    });

    [
      { name: '', room: 'Room 1', workstationCount: 4 },
      { name: 'New Lab', room: '  ', workstationCount: 4 },
      { name: 'New Lab', room: 'Room 1', workstationCount: 0 },
      { name: 'New Lab', room: 'Room 1', workstationCount: 'many' }
    ].forEach((input) => {
      it(`AC-8 invalid input ${JSON.stringify(input)} is refused with ValidationError and no row is added`, () => {
        const before = labCount();
        assert.throws(() => labService.addLab(staff, input), ValidationError);
        assert.equal(labCount(), before);
      });
    });
  });

  describe('AC-9 out of service', () => {
    it('AC-9 a staff member marks a workstation out of service and it is no longer offered for booking', () => {
      labService.setWorkstationStatus(staff, w1, false);
      const offered = labService.getLabsWithWorkstations().flatMap((lab) => lab.workstations.map((w) => w.id));
      assert.equal(offered.includes(w1), false);
      assert.equal(offered.includes(w2), true);
    });

    it('AC-9 a booking request for an out-of-service workstation is refused with ConflictError and adds no row', () => {
      labService.setWorkstationStatus(staff, w1, false);
      assert.throws(
        () => bookingService.createBooking(student.id, { workstationId: w1, date: FUTURE, hour: 10 }, NOW),
        (err) => err instanceof ConflictError && /out of service/.test(err.message)
      );
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n, 0);
    });

    it('AC-9 putting the workstation back in service offers it again', () => {
      labService.setWorkstationStatus(staff, w1, false);
      labService.setWorkstationStatus(staff, w1, true);
      bookingService.createBooking(student.id, { workstationId: w1, date: FUTURE, hour: 10 }, NOW);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n, 1);
    });

    it('AC-9 a student who changes a workstation status is refused and the row is unchanged', () => {
      assert.throws(() => labService.setWorkstationStatus(student, w1, false), ForbiddenError);
      assert.equal(db.prepare('SELECT in_service FROM workstations WHERE id = ?').get(w1).in_service, 1);
    });

    it('AC-9 a workstation that does not exist is refused with NotFoundError', () => {
      assert.throws(() => labService.setWorkstationStatus(staff, 99999, false), NotFoundError);
    });

    it('AC-9 a status that is not true or false is refused with ValidationError', () => {
      assert.throws(() => labService.setWorkstationStatus(staff, w1, 'maybe'), ValidationError);
    });
  });
});
