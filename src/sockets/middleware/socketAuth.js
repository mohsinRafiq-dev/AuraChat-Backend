import { env } from '../../config/env.js';
import { getDevUserId } from '../../config/devUser.js';
import { verifyAccessToken } from '../../utils/token.js';

/**
 * Socket.IO handshake guard.
 * Matches the React client: `io(url, { auth: { token } })`.
 * Also accepts `Authorization: Bearer` on the handshake for non-browser clients.
 * With `SKIP_AUTH=true`, uses the shared dev user (no JWT handshake).
 */
export function socketAuthMiddleware(socket, next) {
  if (env.skipAuth) {
    socket.userId = getDevUserId();
    return next();
  }
  try {
    const raw =
      socket.handshake.auth?.token ||
      String(socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '') ||
      '';
    if (!raw) {
      return next(new Error('invalid token'));
    }
    const payload = verifyAccessToken(raw);
    socket.userId = String(payload.sub);
    return next();
  } catch {
    return next(new Error('invalid token'));
  }
}
