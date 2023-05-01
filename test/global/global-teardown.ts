import { MongoMemoryServer } from 'mongodb-memory-server';

export = async function () {
  const instance: MongoMemoryServer = global.__MONGOINSTANCE;
  await instance.stop({ doCleanup: true });
};
