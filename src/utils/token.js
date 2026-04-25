import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
