import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';
import { redact } from '../src/utils/logger.js';

describe('parseEnv', () => {
  it('applies defaults for development', () => {
    const config = parseEnv({ MONGODB_URI: 'mongodb://127.0.0.1:27017/careerflow' });
    expect(config).toMatchObject({
      env: 'development',
      port: 4000,
      corsOrigins: ['http://localhost:5173'],
      devUserId: '000000000000000000000001',
    });
  });

  it('splits multiple CORS origins', () => {
    const config = parseEnv({ MONGODB_URI: 'x', CLIENT_ORIGIN: 'https://a.example, https://b.example' });
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
  });

  it('requires a database URI outside tests', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/MONGODB_URI: MONGODB_URI is required/);
  });

  it('never enables the development user in production', () => {
    expect(parseEnv({ NODE_ENV: 'production', MONGODB_URI: 'x' }).devUserId).toBeNull();
    expect(() =>
      parseEnv({ NODE_ENV: 'production', MONGODB_URI: 'x', DEV_USER_ID: '000000000000000000000001' }),
    ).toThrow(/DEV_USER_ID must not be set in production/);
  });

  it('reports invalid variables without echoing their values', () => {
    const secret = 'mongodb+srv://admin:hunter2@cluster.example';
    let message = '';
    try {
      parseEnv({ MONGODB_URI: secret, PORT: 'not-a-port' });
    } catch (error) {
      message = error.message;
    }
    expect(message).toContain('PORT');
    expect(message).not.toContain('hunter2');
  });
});

describe('redact', () => {
  it('masks credentials embedded in URLs', () => {
    expect(redact('failed mongodb+srv://admin:hunter2@cluster.example/db')).toBe(
      'failed mongodb+srv://***:***@cluster.example/db',
    );
  });
});
