import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { INestApplication } from '@nestjs/common';
import * as process from 'process';

export type WithIntegrationSetupTestResult<T extends object> = {
  app: INestApplication;
} & T;
export type WithServiceSetupTestResult<T extends object> = T;

export type SetupTestFn<SetupResult extends object> = (
  connection: Connection,
) => Promise<SetupResult>;

export type TestFn<SetupResult extends object> = (
  params: SetupResult,
) => Promise<void>;

export type CleanupFn<SetupResult extends object> = (
  params: SetupResult | undefined,
) => Promise<void>;

export function setupTest<SetupReturn extends object>(
  setUpTestFn: SetupTestFn<SetupReturn>,
  testFn: TestFn<SetupReturn>,
  cleanupFn?: CleanupFn<SetupReturn>,
): () => Promise<void> {
  return async () => {
    const instance = await MongoMemoryServer.create();
    const uri = instance.getUri();
    const mongoConnectionUri = uri.slice(0, uri.lastIndexOf('/'));
    process.env.MONGO__CONNECTION_URI = mongoConnectionUri;
    const connection = mongoose.createConnection(mongoConnectionUri, {
      connectTimeoutMS: 30_000,
    });

    await new Promise((resolve) => {
      setTimeout(() => resolve(1), 1000);
      connection.once('connected', () => {
        resolve(0);
      });
    });

    let setupResult: SetupReturn | undefined = undefined;
    try {
      setupResult = await setUpTestFn(connection);
      await testFn(setupResult);
    } finally {
      await cleanupFn?.(setupResult);
      await connection.close(true);
      await instance.stop({ doCleanup: true, force: true });
    }
  };
}
