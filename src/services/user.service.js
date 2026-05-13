import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 10;

export async function createUser({ email, password, username }) {
  const passwordHash = password
    ? await bcrypt.hash(password, SALT_ROUNDS)
    : await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
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

export async function findPublicUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase().trim() });
}

export async function searchUsers(query, currentUserId) {
  if (!query?.trim()) return [];
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  return User.find({
    _id: { $ne: currentUserId },
    $or: [{ username: regex }, { email: regex }]
  })
    .limit(20)
    .select('email username avatarUrl bio statusMessage lastSeen phone');
}

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
  const fields = ['avatarUrl', 'username', 'bio', 'statusMessage', 'phone', 'lastSeenVisibility', 'avatarVisibility'];
  for (const f of fields) {
    if (updates[f] !== undefined) allowed[f] = updates[f];
  }
  if (Object.keys(allowed).length === 0) {
    throw AppError.badRequest('No profile updates provided');
  }
  return User.findByIdAndUpdate(userId, { $set: allowed }, { new: true });
}

export async function blockUser(userId, targetId) {
  if (String(userId) === String(targetId)) {
    throw AppError.badRequest('Cannot block yourself');
  }
  await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: targetId } });
}

export async function unblockUser(userId, targetId) {
  await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetId } });
}

export async function getBlockedUsers(userId) {
  const user = await User.findById(userId).populate('blockedUsers', 'email username avatarUrl bio statusMessage lastSeen phone');
  if (!user) throw AppError.notFound('User not found');
  return user.blockedUsers || [];
}

export async function updateLastSeen(userId) {
  await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
}
