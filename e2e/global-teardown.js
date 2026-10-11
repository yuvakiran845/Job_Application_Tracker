import { clearE2EDatabase } from './global-setup.js';

/** Runs after the suite: leave no test accounts or records behind. */
export default async function globalTeardown() {
  await clearE2EDatabase();
}
