const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const labService = require('../services/labService');
const isAuthenticated = require('./authGuard');
const { sendError, sendPageError } = require('./httpErrors');

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
    sendError(res, err);
  }
});

router.get('/api/bookings', isAuthenticated, (req, res) => {
  res.json(bookingService.listMyBookings(req.session.user.id));
});

router.delete('/api/bookings/:id', isAuthenticated, (req, res) => {
  try {
    bookingService.cancelBooking(req.session.user, Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/api/all-bookings', isAuthenticated, (req, res) => {
  try {
    res.json(bookingService.listAllBookings(req.session.user));
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/all-bookings', isAuthenticated, (req, res) => {
  try {
    res.render('all-bookings', { bookings: bookingService.listAllBookings(req.session.user) });
  } catch (err) {
    sendPageError(res, err);
  }
});

router.get('/book', isAuthenticated, (req, res) => {
  res.render('book', { labs: labService.getLabsWithWorkstations() });
});

router.get('/my-bookings', isAuthenticated, (req, res) => {
  res.render('my-bookings');
});

module.exports = router;
