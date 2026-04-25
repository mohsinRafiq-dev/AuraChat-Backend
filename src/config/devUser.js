import bcrypt from 'bcryptjs';
import { User } from '../models/User.model.js';

const DEV_EMAIL = 'dev@local.build';

let cachedDevUserId = null;

/**
 * Ensures a stable dev user exists when `SKIP_AUTH` is enabled (no login UI yet).
 */
export async function ensureDevUser() {
  if (cachedDevUserId) return cachedDevUserId;

  let user = await User.findOne({ email: DEV_EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash('skip-auth-placeholder', 10);
    user = await User.create({
      email: DEV_EMAIL,
      username: 'Dev',
      passwordHash
    });
  }
  cachedDevUserId = String(user._id);
  return cachedDevUserId;
}

export function getDevUserId() {
  if (!cachedDevUserId) {
    throw new Error('ensureDevUser() must run before accepting traffic');
  }
  return cachedDevUserId;
}
