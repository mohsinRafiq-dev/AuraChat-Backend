import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  googleCredentialSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema
} from '../validators/schemas.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/google', authLimiter, validateBody(googleCredentialSchema), authController.google);
router.get('/profile', authenticate, authController.profile);
// Sliding session: swaps a still-valid token for a fresh one so ordinary use
// never hits the JWT_EXPIRES_IN wall. Rate-limited like the other auth routes.
router.post('/refresh', authLimiter, authenticate, authController.refresh);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), authController.updateProfile);

export default router;
