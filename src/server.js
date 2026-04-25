import http from 'http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureDevUser } from './config/devUser.js';
import { initSockets } from './sockets/register.js';
import { attachRedisAdapter, disconnectRedisAdapter } from './sockets/redisAdapter.js';
import { SOCKET_EVENTS } from './constants/socketEvents.js';

const app = createApp();
const httpServer = http.createServer(app);
const io = initSockets(httpServer);

const HEARTBEAT_MS = 25_000;
const heartbeatTimer = setInterval(() => {
  io.emit(SOCKET_EVENTS.HEARTBEAT, { t: Date.now() });
}, HEARTBEAT_MS);

async function shutdown(signal) {
  console.info(`${signal} received, shutting down…`);
  clearInterval(heartbeatTimer);
  try {
    io.disconnectSockets(true);
    await disconnectRedisAdapter();
    await disconnectDatabase();
  } catch (e) {
    console.error(e);
  }
  httpServer.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function bootstrap() {
  await connectDatabase();
  if (env.skipAuth) {
    await ensureDevUser();
  }
  await attachRedisAdapter(io);
  httpServer.listen(env.port, () => {
    console.info(`HTTP + Socket.IO listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});
