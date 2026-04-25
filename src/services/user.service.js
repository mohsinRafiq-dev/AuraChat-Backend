import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 10;

export async function createUser({ email, password, username }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    return await User.create({
      email: email.toLowerCase(),
      passwordHash,
      username: username?.trim() || email.split('@')[0]
    });
  } catch (e) {
    if (e?.code === 11000) {
      throw AppError.badRequest('Email already registered');
    }
    throw e;
  }
}

export async function findUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
}

export async function findUserById(id) {
  return User.findById(id);
}

/** Lookup by email without loading `passwordHash` (for starting a DM). */
export async function findPublicUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase().trim() });
}

/**
 * Links `googleSub` to an existing email account or creates a new user (random password hash; password login unused).
 */
export async function findOrCreateUserFromGoogle({ sub, email, name }) {
  if (!email) {
    throw AppError.badRequest('Google account has no email');
  }
  const emailNorm = email.toLowerCase().trim();

  let user = await User.findOne({ googleSub: sub });
  if (user) return user;

  user = await User.findOne({ email: emailNorm });
  if (user) {
    await User.updateOne({ _id: user._id }, { $set: { googleSub: sub } });
    return User.findById(user._id);
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const username = (name || emailNorm.split('@')[0]).trim().slice(0, 64) || 'User';
  try {
    return await User.create({
      email: emailNorm,
      username,
      passwordHash,
      googleSub: sub
    });
  } catch (e) {
    if (e?.code === 11000) {
      return User.findOne({ $or: [{ googleSub: sub }, { email: emailNorm }] });
    }
    throw e;
  }
}

export async function assertPassword(userDoc, password) {
  const ok = await bcrypt.compare(password, userDoc.passwordHash);
  if (!ok) {
    throw AppError.unauthorized('Invalid credentials');
  }
}

export async function updateUserProfile(userId, updates) {
  const allowed = {};
  if (updates.avatarUrl !== undefined) {
    allowed.avatarUrl = updates.avatarUrl;
  }
  if (Object.keys(allowed).length === 0) {
    throw AppError.badRequest('No profile updates provided');
  }
  return User.findByIdAndUpdate(userId, { $set: allowed }, { new: true });
}
