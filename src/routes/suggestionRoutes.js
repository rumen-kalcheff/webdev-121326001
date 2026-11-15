const express = require('express');
const router = express.Router();
const suggestionService = require('../services/suggestionService');
const isAuthenticated = require('./authGuard');
const { sendError } = require('./httpErrors');

// A suggestion is only shown; it never creates a booking.
router.post('/api/suggestions', isAuthenticated, async (req, res) => {
  try {
    const suggestion = await suggestionService.suggestSlot(req.body.text);
    res.json({ label: 'Suggestion', ...suggestion });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
