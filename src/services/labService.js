const labRepository = require('../data/labRepository');
const workstationRepository = require('../data/workstationRepository');

function getAllLabs() {
  return labRepository.findAll();
}

// Labs with their workstations, for the booking form.
function getLabsWithWorkstations() {
  const workstations = workstationRepository.findAll();
  return labRepository.findAll().map((lab) => ({
    ...lab,
    workstations: workstations.filter((w) => w.lab_id === lab.id)
  }));
}

module.exports = {
  getAllLabs,
  getLabsWithWorkstations
};
