const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { ValidationError, NotFoundError, ConflictError } = require('../services/errors');
const isAuthenticated = require('./authGuard');

// Turns the error a service raised into a status code. No rule lives here.
function statusFor(err) {
  if (err instanceof ValidationError) return 400;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ConflictError) return 409;
  return null;
}

router.post('/api/bookings', isAuthenticated, (req, res) => {
  const { workstationId, date, hour } = req.body;
  try {
    const booking = bookingService.createBooking(req.session.user.id, {
      workstationId: Number(workstationId),
      date,
      hour: Number(hour)
    });
    res.status(201).json(booking);
  } catch (err) {
    const status = statusFor(err);
    if (!status) {
      console.error('Booking error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.status(status).json({ error: err.message });
  }
});

router.get('/api/bookings', isAuthenticated, (req, res) => {
  res.json(bookingService.listMyBookings(req.session.user.id));
});

module.exports = router;
