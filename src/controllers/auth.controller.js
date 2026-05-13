import * as userService from '../services/user.service.js';
import * as googleAuthService from '../services/googleAuth.service.js';
import { signAccessToken } from '../utils/token.js';
import { serializeUser } from '../utils/serializers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const register = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  const user = await userService.createUser({ email, password, username });
  const token = signAccessToken(user._id);
  res.status(201).json({ token, user: serializeUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  await userService.assertPassword(user, password);
  const token = signAccessToken(user._id);
  res.json({ token, user: serializeUser(user) });
});

export const profile = asyncHandler(async (req, res) => {
  const user = await userService.findUserById(req.userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ user: serializeUser(user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { avatarUrl, username, bio, statusMessage, phone, lastSeenVisibility, avatarVisibility } = req.body;
  const updated = await userService.updateUserProfile(req.userId, {
    avatarUrl,
    username,
    bio,
    statusMessage,
    phone,
    lastSeenVisibility,
    avatarVisibility
  });
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: serializeUser(updated) });
});

export const google = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const payload = await googleAuthService.verifyGoogleIdToken(credential);
  if (payload.email_verified === false) {
    throw AppError.unauthorized('Google email is not verified');
  }
  const user = await userService.findOrCreateUserFromGoogle({
    sub: payload.sub,
    email: payload.email,
    name: payload.name
  });
  const token = signAccessToken(user._id);
  res.json({ token, user: serializeUser(user) });
});
