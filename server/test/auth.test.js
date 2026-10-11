import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { PASSWORD, api, newAgent, signUp } from './helpers.js';

function sessionCookie(response) {
  return (response.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith('cf_session='));
}

async function forgeToken({ sub, ver = 0, secret = 'test-only-secret-that-is-at-least-32-characters-long', exp = '1h' }) {
  return new SignJWT({ ver })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer('careerflow-api')
    .setAudience('careerflow-web')
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));
}

describe('POST /api/auth/register', () => {
  it('creates an account, starts a session and never exposes the password', async () => {
    const response = await newAgent()
      .post('/api/auth/register')
      .send({ name: '  Priya Raman ', email: 'Priya@Example.COM', password: PASSWORD })
      .expect(201);

    expect(response.body.data).toEqual({
      id: expect.any(String),
      name: 'Priya Raman',
      email: 'priya@example.com',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|hash|tokenVersion/i);

    const cookie = sessionCookie(response);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api/);
    expect(cookie).toMatch(/Max-Age=604800/);

    const stored = await User.findOne({ email: 'priya@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt
    expect(stored.passwordHash).not.toContain(PASSWORD);
  });

  it('rejects a second account with the same email, ignoring case', async () => {
    await signUp({ email: 'priya@example.com' });
    const response = await newAgent()
      .post('/api/auth/register')
      .send({ name: 'Someone', email: 'PRIYA@example.com', password: PASSWORD })
      .expect(409);
    expect(response.body.error).toMatchObject({
      code: 'EMAIL_TAKEN',
      details: { fieldErrors: { email: 'An account with this email already exists.' } },
    });
  });

  it('validates name, email and password', async () => {
    const response = await newAgent()
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(response.body.error.details.fieldErrors).toEqual({
      name: 'Name is required.',
      email: 'Enter a valid email address.',
      password: 'Password must be at least 8 characters.',
    });
  });

  it('rejects passwords bcrypt would truncate or that are only spaces', async () => {
    const tooManyBytes = 'é'.repeat(40); // 40 characters, 80 bytes
    const long = await newAgent().post('/api/auth/register').send({ name: 'A', email: 'a@example.com', password: tooManyBytes });
    expect(long.body.error.details.fieldErrors.password).toBe('Password is too long.');
    const blank = await newAgent().post('/api/auth/register').send({ name: 'A', email: 'a@example.com', password: '          ' });
    expect(blank.body.error.details.fieldErrors.password).toBe('Password can’t be only spaces.');
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with the right password, ignoring email case', async () => {
    await signUp({ email: 'priya@example.com' });
    const response = await newAgent()
      .post('/api/auth/login')
      .send({ email: 'PRIYA@example.com', password: PASSWORD })
      .expect(200);
    expect(response.body.data.email).toBe('priya@example.com');
    expect(sessionCookie(response)).toBeDefined();
  });

  it('gives the same answer for a wrong password and an unknown email, without a cookie', async () => {
    await signUp({ email: 'priya@example.com' });
    const wrongPassword = await newAgent()
      .post('/api/auth/login')
      .send({ email: 'priya@example.com', password: 'not the password' })
      .expect(401);
    const unknownEmail = await newAgent()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'not the password' })
      .expect(401);

    expect(wrongPassword.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(sessionCookie(wrongPassword)).toBeUndefined();
  });
});

describe('sessions', () => {
  it('returns the current user for a valid session', async () => {
    const { agent, user } = await signUp();
    const response = await agent.get('/api/auth/me').expect(200);
    expect(response.body.data).toEqual(user);
  });

  async function getMe(token) {
    const builder = api().get('/api/auth/me');
    if (token) builder.set('Cookie', `cf_session=${token}`);
    return builder;
  }

  it('accepts a correctly signed token (control for the cases below)', async () => {
    const { user } = await signUp();
    expect((await getMe(await forgeToken({ sub: user.id }))).status).toBe(200);
  });

  it.each([
    ['no cookie', async () => null],
    [
      'a token with a modified payload',
      async (id) => {
        const [header, payload, signature] = (await forgeToken({ sub: id })).split('.');
        const changed = payload.slice(0, -1) + (payload.endsWith('A') ? 'B' : 'A');
        return [header, changed, signature].join('.');
      },
    ],
    ['a token signed with another secret', (id) => forgeToken({ sub: id, secret: 'x'.repeat(40) })],
    ['an expired token', (id) => forgeToken({ sub: id, exp: Math.floor(Date.now() / 1000) - 60 })],
    ['a token from before a session revocation', (id) => forgeToken({ sub: id, ver: 5 })],
  ])('rejects %s', async (_label, makeToken) => {
    const { user } = await signUp();
    const response = await getMe(await makeToken(user.id));
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects the session of a deleted account', async () => {
    const { agent, user } = await signUp();
    await User.deleteOne({ _id: user.id });
    await agent.get('/api/auth/me').expect(401);
  });

  it('signs out by clearing the cookie', async () => {
    const { agent } = await signUp();
    const response = await agent.post('/api/auth/logout').expect(204);
    expect(sessionCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
    await agent.get('/api/auth/me').expect(401);
  });

  it('requires a session for every application route', async () => {
    const client = api();
    for (const [method, path] of [
      ['get', '/api/applications'],
      ['get', '/api/applications/stats'],
      ['get', '/api/applications/64b7f0c2a1b2c3d4e5f60718'],
    ]) {
      const response = await client[method](path).expect(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    }
    await api().post('/api/applications').set('X-CSRF-Protection', '1').send({}).expect(401);
  });
});

describe('CSRF protection', () => {
  it('rejects state-changing requests without the CSRF header', async () => {
    const response = await api().post('/api/auth/login').send({ email: 'a@example.com', password: PASSWORD }).expect(403);
    expect(response.body.error.code).toBe('CSRF_REJECTED');
  });

  it('rejects requests from origins that are not allowed', async () => {
    await api({ corsOrigins: ['http://localhost:5173'] })
      .post('/api/auth/logout')
      .set('X-CSRF-Protection', '1')
      .set('Origin', 'https://evil.example')
      .expect(403);
  });

  it('accepts requests from the frontend origin', async () => {
    await api({ corsOrigins: ['http://localhost:5173'] })
      .post('/api/auth/logout')
      .set('X-CSRF-Protection', '1')
      .set('Origin', 'http://localhost:5173')
      .expect(204);
  });

  it('lets the frontend origin send the header after a preflight', async () => {
    const response = await api({ corsOrigins: ['http://localhost:5173'] })
      .options('/api/applications')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-protection')
      .expect(204);
    expect(response.headers['access-control-allow-headers']).toMatch(/x-csrf-protection/);
  });
});

describe('rate limiting', () => {
  it('blocks repeated failed sign-ins', async () => {
    const app = createApp({ authRateLimit: { login: { limit: 3 } } });
    const attempt = () =>
      newAgent(app).post('/api/auth/login').send({ email: 'priya@example.com', password: 'wrong password' });

    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers.ratelimit).toBeDefined();
  });

  it('does not count successful sign-ins', async () => {
    const app = createApp({ authRateLimit: { login: { limit: 2 } } });
    const { user } = await signUp({ app });
    for (let i = 0; i < 5; i += 1) {
      await newAgent(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);
    }
  });

  it('limits account creation per client', async () => {
    const app = createApp({ authRateLimit: { signup: { limit: 2 } } });
    await signUp({ app });
    await signUp({ app });
    const response = await newAgent(app)
      .post('/api/auth/register')
      .send({ name: 'Third', email: 'third@example.com', password: PASSWORD })
      .expect(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('profile', () => {
  it('updates the name', async () => {
    const { agent } = await signUp({ name: 'Old Name' });
    const response = await agent.patch('/api/users/me').send({ name: 'New Name' }).expect(200);
    expect(response.body.data.name).toBe('New Name');
  });

  it('requires the current password to change the email', async () => {
    const { agent } = await signUp({ email: 'old@example.com' });
    const missing = await agent.patch('/api/users/me').send({ email: 'new@example.com' }).expect(400);
    expect(missing.body.error.details.fieldErrors.currentPassword).toMatch(/current password/);
    await agent.patch('/api/users/me').send({ email: 'new@example.com', currentPassword: 'wrong password' }).expect(400);

    await agent.patch('/api/users/me').send({ email: 'New@Example.com', currentPassword: PASSWORD }).expect(200);
    await newAgent().post('/api/auth/login').send({ email: 'new@example.com', password: PASSWORD }).expect(200);
  });

  it('does not let two accounts share an email', async () => {
    await signUp({ email: 'taken@example.com' });
    const { agent } = await signUp();
    const response = await agent
      .patch('/api/users/me')
      .send({ email: 'taken@example.com', currentPassword: PASSWORD })
      .expect(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('changes the password and signs out every other session', async () => {
    const { agent: laptop, user } = await signUp();
    const phone = newAgent();
    await phone.post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);

    await laptop.put('/api/users/me/password').send({ currentPassword: 'wrong password', newPassword: 'another good password' }).expect(400);
    await laptop.put('/api/users/me/password').send({ currentPassword: PASSWORD, newPassword: 'another good password' }).expect(204);

    await laptop.get('/api/auth/me').expect(200); // re-issued cookie
    await phone.get('/api/auth/me').expect(401); // revoked
    await newAgent().post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);
    await newAgent().post('/api/auth/login').send({ email: user.email, password: 'another good password' }).expect(200);
  });
});

describe('security headers', () => {
  it('sets Helmet headers', async () => {
    const response = await api().get('/api/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['cross-origin-resource-policy']).toBe('same-site');
  });
});
