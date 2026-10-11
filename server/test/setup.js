import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';

// Each test file (worker) gets its own database on the shared throwaway server.
beforeAll(async () => {
  const dbName = `careerflow_test_${process.env.VITEST_POOL_ID ?? '0'}_${Date.now()}`;
  await mongoose.connect(inject('mongoUri'), { dbName });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
