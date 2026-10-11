import { MongoClient } from 'mongodb';
import { E2E_MONGODB_URI } from './playwright.config.js';

/**
 * Empties the E2E database. Documents are deleted (not the database), so the
 * indexes the API created at startup — including the unique email index — stay in
 * place. Refuses to touch any database whose name doesn't end in "_e2e".
 */
export async function clearE2EDatabase() {
  const client = new MongoClient(E2E_MONGODB_URI, { serverSelectionTimeoutMS: 5_000 });
  await client.connect();
  try {
    const db = client.db();
    if (!db.databaseName.endsWith('_e2e')) {
      throw new Error(`Refusing to clear "${db.databaseName}": the E2E database name must end in "_e2e".`);
    }
    for (const collection of await db.collections()) {
      await collection.deleteMany({});
    }
  } finally {
    await client.close();
  }
}

/** Runs before the suite: start from an empty database. */
export default async function globalSetup() {
  await clearE2EDatabase();
}
