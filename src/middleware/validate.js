import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest('Validation failed', parsed.error.flatten()));
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(AppError.badRequest('Invalid query', parsed.error.flatten()));
    }
    req.query = parsed.data;
    return next();
  };
}

export function formatZodError(err) {
  if (err instanceof ZodError) {
    return { message: 'Validation failed', details: err.flatten() };
  }
  return null;
}
