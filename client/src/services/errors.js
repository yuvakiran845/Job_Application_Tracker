// Errors raised by the data layer, whether it is the in-memory mock or the REST API.
// The UI handles them the same way regardless of the data source. Messages are
// safe to show to users.

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

/** Any other failed request: network problems, timeouts, server errors. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
