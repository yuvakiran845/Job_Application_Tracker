import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const OBJECT_ID = /^[a-f\d]{24}$/i;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: z.string().trim().optional(),
    // Comma-separated list of browser origins allowed to call the API.
    CLIENT_ORIGIN: z.string().trim().default('http://localhost:5173'),
    // Temporary stand-in user for development until authentication (Level 5).
    DEV_USER_ID: z.string().trim().regex(OBJECT_ID, 'DEV_USER_ID must be a 24-character hex ObjectId.').optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'test' && !env.MONGODB_URI) {
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'MONGODB_URI is required.' });
    }
    if (env.NODE_ENV === 'production' && env.DEV_USER_ID) {
      ctx.addIssue({
        code: 'custom',
        path: ['DEV_USER_ID'],
        message: 'DEV_USER_ID must not be set in production.',
      });
    }
  });

const DEFAULT_DEV_USER_ID = '000000000000000000000001';

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
  return Object.freeze({
    env: parsed.NODE_ENV,
    isProduction,
    port: parsed.PORT,
    mongodbUri: parsed.MONGODB_URI,
    corsOrigins: parsed.CLIENT_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    devUserId: isProduction ? null : (parsed.DEV_USER_ID ?? DEFAULT_DEV_USER_ID),
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
