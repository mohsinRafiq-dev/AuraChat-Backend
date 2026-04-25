import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Single connection for the process. Mongoose buffers commands until connected.
 */
export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production'
  });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
