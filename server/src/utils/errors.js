/**
 * An error that is safe to show to API clients. Anything else that reaches the
 * error handler is treated as an unexpected 500 and its details stay in the logs.
 */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(fieldErrors, message = 'Some fields need your attention.') {
    super(400, 'VALIDATION_ERROR', message, { fieldErrors });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Application not found.') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}
