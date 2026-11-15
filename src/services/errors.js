// Errors the services raise. They carry a readable sentence and know nothing about HTTP;
// route handlers translate the class into a status code.
class ValidationError extends Error {}
class NotFoundError extends Error {}
class ConflictError extends Error {}
class ForbiddenError extends Error {}

module.exports = { ValidationError, NotFoundError, ConflictError, ForbiddenError };
