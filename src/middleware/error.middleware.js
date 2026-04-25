import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

function normalizeError(err) {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: {
        error: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: { error: 'Validation failed', details: err.flatten() }
    };
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return { status: 401, body: { error: 'Invalid or expired token' } };
  }
  return {
    status: 500,
    body: { error: env.nodeEnv === 'production' ? 'Internal server error' : err.message }
  };
}

// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, next) {
  const { status, body } = normalizeError(err);
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json(body);
}
