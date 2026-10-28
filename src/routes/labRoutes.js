const express = require('express');
const router = express.Router();
const labService = require('../services/labService');
const isAuthenticated = require('./authGuard');

router.get('/labs', isAuthenticated, (req, res) => {
  const labs = labService.getAllLabs();
  res.render('labs', { labs });
});

router.get('/api/labs', isAuthenticated, (req, res) => {
  const labs = labService.getAllLabs();
  res.json(labs);
});

module.exports = router;
