// Errors the services raise. They carry a readable sentence and know nothing about HTTP;
// route handlers translate the class into a status code.
class ValidationError extends Error {}
class NotFoundError extends Error {}
class ConflictError extends Error {}
class ForbiddenError extends Error {}
class UnavailableError extends Error {}
class BusyError extends Error {}
class UnusableAnswerError extends Error {}

module.exports = {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnavailableError,
  BusyError,
  UnusableAnswerError
};
