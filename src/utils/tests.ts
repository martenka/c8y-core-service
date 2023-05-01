import { Connection } from 'mongoose';

export function clearCollections(connection: Connection) {
  return async function () {
    const collections = connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  };
}
