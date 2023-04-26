import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export = async function () {
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();

  global.__MONGOINSTANCE = instance;
  process.env.MONGO__CONNECTION_URI = uri.slice(0, uri.lastIndexOf('/'));

  // Check the database before starting tests
  await mongoose.connect(process.env.MONGO__CONNECTION_URI);
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
};
