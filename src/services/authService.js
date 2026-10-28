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

module.exports = {
  login
};
