import { MongoMemoryServer } from 'mongodb-memory-server-core';

/**
 * Starts a temporary MongoDB server (random port, temporary data directory) that
 * is deleted after the run, so tests never touch development or production data.
 *
 * The first run downloads a MongoDB binary (~100 MB, cached afterwards). To reuse
 * an installed MongoDB instead, set MONGOMS_SYSTEM_BINARY to its mongod path.
 */
export default async function setup({ provide }) {
  const mongod = await MongoMemoryServer.create();
  provide('mongoUri', mongod.getUri());

  return async () => {
    await mongod.stop();
  };
}
