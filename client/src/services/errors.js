// Error raised when the data layer rejects input. The Level 6 API client will
// translate HTTP 400 responses into this same shape, so forms handle both alike.
export class ValidationError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}
