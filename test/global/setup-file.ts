import mongoose from 'mongoose';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO__CONNECTION_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
});
