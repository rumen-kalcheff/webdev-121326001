const labRepository = require('../data/labRepository');
const workstationRepository = require('../data/workstationRepository');
const { requireStaff } = require('./permissions');
const { ValidationError, NotFoundError } = require('./errors');

const MAX_WORKSTATIONS = 100;

function getAllLabs() {
  return labRepository.findAll();
}

function withWorkstations(workstations) {
  return labRepository.findAll().map((lab) => ({
    ...lab,
    workstations: workstations.filter((w) => w.lab_id === lab.id)
  }));
}

// For the booking form: only workstations that are in service are offered.
function getLabsWithWorkstations() {
  return withWorkstations(workstationRepository.findAll({ onlyInService: true }));
}

// For the manage page: every workstation with its status.
function getLabsForManagement(user) {
  requireStaff(user);
  return withWorkstations(workstationRepository.findAll());
}

function addLab(user, { name, room, workstationCount }) {
  requireStaff(user);
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanRoom = typeof room === 'string' ? room.trim() : '';
  if (!cleanName || !cleanRoom) {
    throw new ValidationError('A lab needs a name and a room');
  }
  if (!Number.isInteger(workstationCount) || workstationCount < 1 || workstationCount > MAX_WORKSTATIONS) {
    throw new ValidationError(`The number of workstations must be a whole number from 1 to ${MAX_WORKSTATIONS}`);
  }
  return labRepository.insertWithWorkstations(cleanName, cleanRoom, workstationCount);
}

function setWorkstationStatus(user, workstationId, inService) {
  requireStaff(user);
  if (typeof inService !== 'boolean') {
    throw new ValidationError('inService must be true or false');
  }
  if (!workstationRepository.findById(workstationId)) {
    throw new NotFoundError('Workstation not found');
  }
  return workstationRepository.setInService(workstationId, inService);
}

module.exports = {
  getAllLabs,
  getLabsWithWorkstations,
  getLabsForManagement,
  addLab,
  setWorkstationStatus
};
