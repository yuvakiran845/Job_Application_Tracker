import { AppError, ValidationError } from '../utils/errors.js';

/** Converts zod issues to `{ "contact.email": "message" }`, keeping the first message per field. */
function toFieldErrors(issues) {
  const fieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Validates and normalizes request parts with zod schemas. Parsed values are put on
 * `req.validated` (Express 5's req.query is read-only), so handlers only ever see
 * checked, trimmed data with unknown fields removed.
 */
export function validate({ params, query, body }) {
  return (req, _res, next) => {
    req.validated = {};

    if (params) {
      const result = params.safeParse(req.params);
      // A malformed ID is its own error code so clients can treat it like "not found".
      if (!result.success) return next(new AppError(400, 'INVALID_ID', result.error.issues[0].message));
      req.validated.params = result.data;
    }

    for (const [part, schema] of [
      ['query', query],
      ['body', body],
    ]) {
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const rootIssue = result.error.issues.find((issue) => issue.path.length === 0);
        return next(new ValidationError(toFieldErrors(result.error.issues), rootIssue?.message));
      }
      req.validated[part] = result.data;
    }

    return next();
  };
}
