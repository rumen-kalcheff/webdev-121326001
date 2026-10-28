const labRepository = require('../data/labRepository');

function getAllLabs() {
  return labRepository.findAll();
}

module.exports = {
  getAllLabs
};
