// The project's MCP tools. Every tool calls the same service function the HTTP route
// calls, on behalf of one known user, so the rules and permissions are the same in both.
const authService = require('../src/services/authService');
const bookingService = require('../src/services/bookingService');
const labService = require('../src/services/labService');
const errors = require('../src/services/errors');

const PROJECT_TOOLS = [
  {
    name: 'list_labs',
    description: 'Returns every lab with its room, seat count and the number of workstations in service. Use it when the user asks which labs exist or where they can sit.',
    inputSchema: { type: 'object', properties: {} },
    run: () => labService.getLabSummaries()
  },
  {
    name: 'create_booking',
    description: 'Books one workstation for one whole-hour slot for the signed-in user. Refuses taken slots, past times, hours outside 08:00-20:00, out-of-service workstations and a fourth active future booking.',
    inputSchema: {
      type: 'object',
      properties: {
        workstationId: { type: 'integer', description: 'The id of the workstation.' },
        date: { type: 'string', description: 'The day, as YYYY-MM-DD.' },
        hour: { type: 'integer', description: 'The hour the slot starts, from 8 to 19.' }
      },
      required: ['workstationId', 'date', 'hour']
    },
    run: (user, args) => bookingService.createBooking(user.id, {
      workstationId: args.workstationId,
      date: args.date,
      hour: args.hour
    })
  },
  {
    name: 'cancel_booking',
    description: 'Cancels one booking by id and sets its status to cancelled. A student can cancel only their own bookings; staff can cancel any.',
    inputSchema: {
      type: 'object',
      properties: { bookingId: { type: 'integer', description: 'The id of the booking.' } },
      required: ['bookingId']
    },
    run: (user, args) => {
      bookingService.cancelBooking(user, args.bookingId);
      return { cancelled: args.bookingId };
    }
  },
  {
    name: 'list_all_bookings',
    description: 'Returns the bookings of every student with lab, workstation, hour and status. Staff only.',
    inputSchema: { type: 'object', properties: {} },
    run: (user) => bookingService.listAllBookings(user)
  },
  {
    name: 'set_workstation_status',
    description: 'Marks a workstation as in service (true) or out of service (false), so it is offered or hidden for booking. Staff only.',
    inputSchema: {
      type: 'object',
      properties: {
        workstationId: { type: 'integer', description: 'The id of the workstation.' },
        inService: { type: 'boolean', description: 'true to offer it for booking, false to hide it.' }
      },
      required: ['workstationId', 'inService']
    },
    run: (user, args) => labService.setWorkstationStatus(user, args.workstationId, args.inService)
  }
];

function listTools() {
  return PROJECT_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

// Who is calling: the user whose email is in MCP_USER_EMAIL, or nobody.
function userFromEnv(env = process.env) {
  return authService.getUserByEmail(env.MCP_USER_EMAIL);
}

function toolResult(text, isError) {
  return { content: [{ type: 'text', text }], isError };
}

// Returns an MCP tool result, or null when the name is not one of the project tools.
// A refusal from a service is a tool error with its readable sentence, never a crash.
function callTool(user, name, args = {}) {
  const tool = PROJECT_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) return null;
  if (!user) {
    return toolResult('Not signed in: set MCP_USER_EMAIL to the email of an existing user', true);
  }
  try {
    return toolResult(JSON.stringify(tool.run(user, args), null, 2), false);
  } catch (err) {
    if (Object.values(errors).some((ServiceError) => err instanceof ServiceError)) {
      return toolResult(err.message, true);
    }
    return toolResult('The tool failed', true);
  }
}

module.exports = { listTools, callTool, userFromEnv };
