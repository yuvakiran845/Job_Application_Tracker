// Errors raised by the data layer. The Level 6 API client will translate HTTP
// 400 and 404 responses into these same classes, so the UI handles both alike.

export class ValidationError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'This application no longer exists. It may have been deleted.') {
    super(message);
    this.name = 'NotFoundError';
  }
}
