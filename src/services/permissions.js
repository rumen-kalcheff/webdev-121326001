const { ForbiddenError } = require('./errors');

function requireStaff(user) {
  if (!user || user.role !== 'staff') {
    throw new ForbiddenError('Only staff can do this');
  }
}

module.exports = { requireStaff };
