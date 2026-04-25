import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from '../config/env.js';

let pubClient = null;
let subClient = null;

/**
 * Enables Socket.IO to broadcast across multiple Node processes via Redis pub/sub.
 * No-op when `REDIS_URL` is unset (single-node in-memory adapter).
 */
export async function attachRedisAdapter(io) {
  if (!env.redisUrl) {
    return;
  }
  pubClient = createClient({ url: env.redisUrl });
  subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));
  console.info('[socket] Redis adapter attached for horizontal scaling');
}

export async function disconnectRedisAdapter() {
  try {
    if (subClient) await subClient.quit();
  } catch (e) {
    console.warn('[socket] Redis sub quit', e);
  }
  try {
    if (pubClient) await pubClient.quit();
  } catch (e) {
    console.warn('[socket] Redis pub quit', e);
  }
  subClient = null;
  pubClient = null;
}
