const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../services/errors');

// Turns the error a service raised into a status code. No rule lives here.
function statusFor(err) {
  if (err instanceof ValidationError) return 400;
  if (err instanceof ForbiddenError) return 403;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ConflictError) return 409;
  return null;
}

// Sends the JSON error for an API route.
function sendError(res, err) {
  const status = statusFor(err);
  if (!status) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  return res.status(status).json({ error: err.message });
}

// Sends the error for a page: the same sentence, never a stack trace.
function sendPageError(res, err) {
  const status = statusFor(err);
  if (!status) {
    console.error('Unexpected error:', err);
    return res.status(500).send('Internal server error');
  }
  return res.status(status).send(err.message);
}

module.exports = { sendError, sendPageError };
