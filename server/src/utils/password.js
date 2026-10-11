import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

export function hashPassword(password) {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

let dummyHash;

/**
 * Runs a bcrypt comparison against a throwaway hash. Used when no account matches
 * an email, so a failed login takes as long as a wrong password and response
 * times don't reveal which emails are registered.
 */
export async function verifyAgainstDummy(password) {
  dummyHash ??= await bcrypt.hash(randomBytes(16).toString('hex'), config.auth.bcryptRounds);
  await bcrypt.compare(password, dummyHash);
  return false;
}
