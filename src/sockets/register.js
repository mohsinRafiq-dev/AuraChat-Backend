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
    // WebSocket is preferred, but polling must stay available as a fallback:
    // some corporate proxies and mobile networks block WS upgrades outright,
    // and websocket-only means those clients cannot connect at all.
    transports: ['websocket', 'polling'],

    /**
     * Presence responsiveness.
     *
     * A clean tab close sends a disconnect immediately, but a closed laptop,
     * dropped Wi-Fi or killed process sends nothing — the server only notices
     * when a ping goes unanswered. Worst-case detection is roughly
     * pingInterval + pingTimeout, so the defaults (25s + 20s) left a user
     * showing as "online" for up to 45 seconds after they vanished.
     *
     * 10s + 5s brings that to ~15s worst case, usually faster, at the cost of
     * a few extra bytes per client per 10s. Lower these further for snappier
     * presence; raise them to be kinder to mobile batteries.
     */
    pingInterval: 10_000,
    pingTimeout: 5_000,

    /**
     * Media rides the socket as a base64 data URL. The default 1MB buffer
     * silently drops anything larger — the client's ack never arrives and the
     * message just appears to fail. 4MB matches the ~3MB schema cap with room
     * for the rest of the envelope.
     */
    maxHttpBufferSize: 4e6
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
