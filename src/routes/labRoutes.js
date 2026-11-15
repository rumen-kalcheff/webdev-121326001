const express = require('express');
const router = express.Router();
const labService = require('../services/labService');
const isAuthenticated = require('./authGuard');
const { sendError, sendPageError } = require('./httpErrors');

router.get('/labs', isAuthenticated, (req, res) => {
  const labs = labService.getAllLabs();
  res.render('labs', { labs });
});

router.get('/api/labs', isAuthenticated, (req, res) => {
  const labs = labService.getAllLabs();
  res.json(labs);
});

router.post('/api/labs', isAuthenticated, (req, res) => {
  const { name, room, workstationCount } = req.body;
  try {
    const lab = labService.addLab(req.session.user, { name, room, workstationCount: Number(workstationCount) });
    res.status(201).json(lab);
  } catch (err) {
    sendError(res, err);
  }
});

router.patch('/api/workstations/:id', isAuthenticated, (req, res) => {
  try {
    const workstation = labService.setWorkstationStatus(req.session.user, Number(req.params.id), req.body.inService);
    res.json(workstation);
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/manage', isAuthenticated, (req, res) => {
  try {
    res.render('manage', { labs: labService.getLabsForManagement(req.session.user) });
  } catch (err) {
    sendPageError(res, err);
  }
});

module.exports = router;
