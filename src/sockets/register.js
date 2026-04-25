import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { socketAuthMiddleware } from './middleware/socketAuth.js';
import { wireConnection } from './handlers/connection.handler.js';

/**
 * Attaches Socket.IO to the same HTTP server as Express (required for websocket upgrades).
 */
export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin === '*' ? true : env.corsOrigin,
      credentials: true
    },
    transports: ['websocket']
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    wireConnection(io, socket).catch((err) => {
      console.error('Socket connection setup failed', err);
      socket.disconnect(true);
    });
  });

  return io;
}
