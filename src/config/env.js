import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * In development, allows local work without a `.env` file. Production always requires explicit values.
 */
function requiredInProduction(name, devDefault, devHint) {
  const raw = process.env[name];
  if (raw && String(raw).trim()) return String(raw).trim();
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  console.warn(`[env] ${name} not set — using development default (${devHint}). Set ${name} in backend/.env for non-defaults.`);
  return devDefault;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongoUri: requiredInProduction(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/chat-app',
    'local MongoDB'
  ),
  jwtSecret: requiredInProduction(
    'JWT_SECRET',
    'dev-only-insecure-jwt-secret-do-not-use-in-production-min-32',
    'insecure JWT signing'
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  /** Web client ID from Google Cloud Console (used to verify ID tokens from the SPA). */
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
  /** Optional; only needed for authorization-code / refresh-token flows (not used for GIS ID tokens). */
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || null,
  /** e.g. redis://127.0.0.1:6379 — enables `@socket.io/redis-adapter` for multi-node. */
  redisUrl: process.env.REDIS_URL?.trim() || null,
  /**
   * When true, HTTP + sockets use a fixed dev user (no JWT).
   * In development, defaults to ON unless you set SKIP_AUTH=false.
   * In production, only ON if SKIP_AUTH=true (avoid shipping this enabled).
   */
  skipAuth:
    process.env.SKIP_AUTH === 'true' ||
    (!isProduction && process.env.SKIP_AUTH !== 'false')
};
