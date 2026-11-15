const assert = require('node:assert/strict');
const db = require('../src/data/db');
const { resetDb } = require('./helpers');
const tools = require('../mcp-server/tools');

const FUTURE = '2099-01-15';

describe('Slice 4: MCP tools go through the services', () => {
  let student;
  let staff;
  let w1;

  beforeEach(() => {
    resetDb();
    student = db.prepare("SELECT id, email, role FROM users WHERE email = 'student@example.com'").get();
    staff = db.prepare("SELECT id, email, role FROM users WHERE email = 'staff@example.com'").get();
    w1 = db.prepare('SELECT id FROM workstations ORDER BY id LIMIT 1').get().id;
  });

  const bookingCount = () => db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n;
  const call = (user, name, args = {}) => tools.callTool(user, name, args);
  const text = (result) => result.content[0].text;

  it('AC-18 create_booking books a free slot and a taken slot returns a tool error "This slot is taken" with no new row', () => {
    const ok = call(student, 'create_booking', { workstationId: w1, date: FUTURE, hour: 10 });
    assert.equal(ok.isError, false);
    assert.equal(bookingCount(), 1);

    const taken = call(staff, 'create_booking', { workstationId: w1, date: FUTURE, hour: 10 });
    assert.equal(taken.isError, true);
    assert.equal(text(taken), 'This slot is taken');
    assert.equal(bookingCount(), 1);
  });

  it('AC-18 cancel_booking follows the owner rule: another student gets a tool error and the row is unchanged', () => {
    const created = JSON.parse(text(call(student, 'create_booking', { workstationId: w1, date: FUTURE, hour: 10 })));
    const other = { id: 999, email: 'x@example.com', role: 'student' };
    const refused = call(other, 'cancel_booking', { bookingId: created.id });
    assert.equal(refused.isError, true);
    assert.equal(db.prepare('SELECT status FROM bookings WHERE id = ?').get(created.id).status, 'active');

    const done = call(student, 'cancel_booking', { bookingId: created.id });
    assert.equal(done.isError, false);
    assert.equal(db.prepare('SELECT status FROM bookings WHERE id = ?').get(created.id).status, 'cancelled');
  });

  it('AC-19 a student calling list_all_bookings or set_workstation_status gets "Only staff can do this" and nothing changes', () => {
    call(student, 'create_booking', { workstationId: w1, date: FUTURE, hour: 10 });
    const all = call(student, 'list_all_bookings');
    assert.equal(all.isError, true);
    assert.equal(text(all), 'Only staff can do this');

    const status = call(student, 'set_workstation_status', { workstationId: w1, inService: false });
    assert.equal(status.isError, true);
    assert.equal(text(status), 'Only staff can do this');
    assert.equal(db.prepare('SELECT in_service FROM workstations WHERE id = ?').get(w1).in_service, 1);
  });

  it('AC-19 a staff member lists every booking and takes a workstation out of service', () => {
    call(student, 'create_booking', { workstationId: w1, date: FUTURE, hour: 10 });
    const all = call(staff, 'list_all_bookings');
    assert.equal(all.isError, false);
    assert.equal(JSON.parse(text(all)).length, 1);

    const status = call(staff, 'set_workstation_status', { workstationId: w1, inService: false });
    assert.equal(status.isError, false);
    assert.equal(db.prepare('SELECT in_service FROM workstations WHERE id = ?').get(w1).in_service, 0);
  });

  it('AC-20 list_labs returns every lab with room, seats and the number of workstations in service', () => {
    call(staff, 'set_workstation_status', { workstationId: w1, inService: false });
    const labs = JSON.parse(text(call(student, 'list_labs')));
    assert.equal(labs.length, 2);
    const first = labs.find((lab) => lab.name === 'Computer Lab 1');
    assert.equal(first.room, 'Room 101');
    assert.equal(first.seats, 20);
    assert.equal(first.workstationsInService, 19);
  });

  it('AC-21 when nobody is known, every project tool returns a tool error and no data is touched', () => {
    tools.listTools().forEach((tool) => {
      const result = tools.callTool(null, tool.name, { workstationId: w1, date: FUTURE, hour: 10, bookingId: 1, inService: false });
      assert.equal(result.isError, true, tool.name);
      assert.match(text(result), /not signed in/i);
    });
    assert.equal(bookingCount(), 0);
    assert.equal(db.prepare('SELECT in_service FROM workstations WHERE id = ?').get(w1).in_service, 1);
  });

  it('AC-21 an unknown tool name is not a project tool', () => {
    assert.equal(tools.callTool(student, 'drop_everything', {}), null);
  });

  it('AC-21 userFromEnv finds the user by MCP_USER_EMAIL and knows nobody otherwise', () => {
    assert.equal(tools.userFromEnv({ MCP_USER_EMAIL: 'staff@example.com' }).role, 'staff');
    assert.equal(tools.userFromEnv({ MCP_USER_EMAIL: 'nobody@example.com' }), null);
    assert.equal(tools.userFromEnv({}), null);
  });
});
