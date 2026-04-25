import { env } from '../config/env.js';
import { getDevUserId } from '../config/devUser.js';
import { verifyAccessToken } from '../utils/token.js';
import { AppError } from '../utils/AppError.js';

/**
 * HTTP JWT guard: expects `Authorization: Bearer <token>`.
 * With `SKIP_AUTH=true`, attaches the shared dev user (no header required).
 */
export function authenticate(req, _res, next) {
  if (env.skipAuth) {
    req.userId = getDevUserId();
    return next();
  }
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized();
    }
    const raw = header.slice('Bearer '.length).trim();
    if (!raw) throw AppError.unauthorized();
    const payload = verifyAccessToken(raw);
    req.userId = String(payload.sub);
    return next();
  } catch (e) {
    if (e instanceof AppError) return next(e);
    return next(AppError.unauthorized());
  }
}
