// Minimal structured logger. Silent during tests to keep output readable.
// Never pass request bodies, headers or tokens to it. As a safety net, any
// credentials embedded in URLs (e.g. mongodb+srv://user:pass@host) are masked.

const silent = process.env.NODE_ENV === 'test';
const URL_CREDENTIALS = /\/\/[^/\s:@]+:[^@\s]+@/g;

export function redact(text) {
  return text.replace(URL_CREDENTIALS, '//***:***@');
}

function write(level, message, meta) {
  if (silent) return;
  const line = redact(meta ? `${message} ${JSON.stringify(meta)}` : message);
  const output = level === 'error' ? console.error : console.log;
  output(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${line}`);
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
