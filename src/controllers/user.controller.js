import * as userService from '../services/user.service.js';
import { serializeUser } from '../utils/serializers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) throw AppError.badRequest('q is required');
  const users = await userService.searchUsers(q, req.userId);
  res.json({ users: users.map((u) => serializeUser(u)) });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.findUserById(id);
  if (!user) throw AppError.notFound('User not found');
  res.json({ user: serializeUser(user) });
});

export const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await userService.blockUser(req.userId, id);
  res.json({ success: true });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await userService.unblockUser(req.userId, id);
  res.json({ success: true });
});

export const getBlockedUsers = asyncHandler(async (req, res) => {
  const users = await userService.getBlockedUsers(req.userId);
  res.json({ users: users.map((u) => serializeUser(u)) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.userId, req.body);
  res.json({ user: serializeUser(user) });
});
