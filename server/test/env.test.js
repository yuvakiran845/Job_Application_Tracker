import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';
import { redact } from '../src/utils/logger.js';

const SECRET = 'a'.repeat(40);
const base = { MONGODB_URI: 'mongodb://127.0.0.1:27017/careerflow', JWT_SECRET: SECRET };

describe('parseEnv', () => {
  it('applies defaults for development', () => {
    const config = parseEnv(base);
    expect(config).toMatchObject({
      env: 'development',
      port: 4000,
      corsOrigins: ['http://localhost:5173'],
      trustProxy: 0,
      auth: { sessionDays: 7, cookieSecure: false, cookieSameSite: 'lax', bcryptRounds: 12 },
    });
  });

  it('uses secure cookies by default in production', () => {
    expect(parseEnv({ ...base, NODE_ENV: 'production' }).auth.cookieSecure).toBe(true);
  });

  it('splits multiple CORS origins', () => {
    const config = parseEnv({ ...base, CLIENT_ORIGIN: 'https://a.example, https://b.example' });
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
  });

  it('requires a database URI and a strong JWT secret outside tests', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/MONGODB_URI is required[\s\S]*JWT_SECRET is required/);
    expect(() => parseEnv({ ...base, JWT_SECRET: 'too-short' })).toThrow(/at least 32 characters/);
  });

  it('needs no secrets in tests', () => {
    expect(parseEnv({ NODE_ENV: 'test' }).auth).toMatchObject({ bcryptRounds: 4, jwtSecret: expect.any(String) });
  });

  it('rejects unsafe cookie and hashing settings', () => {
    expect(() => parseEnv({ ...base, COOKIE_SAMESITE: 'none' })).toThrow(/requires COOKIE_SECURE=true/);
    expect(parseEnv({ ...base, COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'true' }).auth.cookieSameSite).toBe('none');
    expect(() => parseEnv({ ...base, NODE_ENV: 'production', BCRYPT_ROUNDS: '6' })).toThrow(/at least 10 in production/);
  });

  it('reports invalid variables without echoing their values', () => {
    const secret = 'mongodb+srv://admin:hunter2@cluster.example';
    let message = '';
    try {
      parseEnv({ ...base, MONGODB_URI: secret, PORT: 'not-a-port', JWT_SECRET: 'short-but-secret-value' });
    } catch (error) {
      message = error.message;
    }
    expect(message).toContain('PORT');
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('short-but-secret-value');
  });
});

describe('redact', () => {
  it('masks credentials embedded in URLs', () => {
    expect(redact('failed mongodb+srv://admin:hunter2@cluster.example/db')).toBe(
      'failed mongodb+srv://***:***@cluster.example/db',
    );
  });
});
