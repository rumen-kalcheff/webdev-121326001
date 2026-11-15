const bcrypt = require('bcrypt');
const userRepository = require('../data/userRepository');

async function login(email, password) {
  const user = userRepository.findByEmail(email);
  if (!user) {
    return null;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return null;
  }

  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...userWithoutHash } = user;
  return userWithoutHash;
}

// The user as the rest of the app sees them (never the password hash), or null.
function getUserByEmail(email) {
  const user = typeof email === 'string' ? userRepository.findByEmail(email) : null;
  if (!user) {
    return null;
  }
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...userWithoutHash } = user;
  return userWithoutHash;
}

module.exports = {
  login,
  getUserByEmail
};
