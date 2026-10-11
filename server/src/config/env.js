import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

// Only used when NODE_ENV=test, so the test suite needs no secrets.
const TEST_JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters-long';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: z.string().trim().optional(),
    // Comma-separated list of browser origins allowed to call the API.
    CLIENT_ORIGIN: z.string().trim().default('http://localhost:5173'),
    // Signs session tokens. Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.').optional(),
    SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    // Secure cookies are only sent over HTTPS. Defaults to true in production.
    COOKIE_SECURE: booleanString.optional(),
    // "lax" when the frontend and API share a site (recommended); "none" for different sites (requires HTTPS).
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    // Number of reverse proxies in front of the API (e.g. 1 on most hosting platforms), so
    // rate limiting sees the real client IP. 0 = trust none.
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).optional(),
  })
  .superRefine((env, ctx) => {
    const isTest = env.NODE_ENV === 'test';
    if (!isTest && !env.MONGODB_URI) {
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'MONGODB_URI is required.' });
    }
    if (!isTest && !env.JWT_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET is required.' });
    }
    const secure = env.COOKIE_SECURE ?? env.NODE_ENV === 'production';
    if (env.COOKIE_SAMESITE === 'none' && !secure) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SAMESITE'],
        message: 'COOKIE_SAMESITE=none requires COOKIE_SECURE=true (browsers reject it otherwise).',
      });
    }
    if (env.NODE_ENV === 'production' && (env.BCRYPT_ROUNDS ?? 12) < 10) {
      ctx.addIssue({ code: 'custom', path: ['BCRYPT_ROUNDS'], message: 'BCRYPT_ROUNDS must be at least 10 in production.' });
    }
  });

/** Validates environment variables and returns the app configuration. Pure, so it can be tested. */
export function parseEnv(env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Report which variables are wrong, never their values (they may be secrets).
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }

  const parsed = result.data;
  const isProduction = parsed.NODE_ENV === 'production';
  const isTest = parsed.NODE_ENV === 'test';
  return Object.freeze({
    env: parsed.NODE_ENV,
    isProduction,
    port: parsed.PORT,
    mongodbUri: parsed.MONGODB_URI,
    corsOrigins: parsed.CLIENT_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: parsed.TRUST_PROXY,
    auth: Object.freeze({
      jwtSecret: parsed.JWT_SECRET ?? (isTest ? TEST_JWT_SECRET : undefined),
      sessionDays: parsed.SESSION_DAYS,
      cookieSecure: parsed.COOKIE_SECURE ?? isProduction,
      cookieSameSite: parsed.COOKIE_SAMESITE,
      // Cost 4 keeps tests fast; 12 is the default everywhere else.
      bcryptRounds: parsed.BCRYPT_ROUNDS ?? (isTest ? 4 : 12),
    }),
  });
}

function loadEnvFile() {
  // Tests configure themselves; never let a developer's local .env leak into them.
  if (process.env.NODE_ENV === 'test') return;
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
  // Variables already set in the real environment take precedence over the file.
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

loadEnvFile();

export const config = parseEnv(process.env);
