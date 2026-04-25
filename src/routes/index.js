import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import authRoutes from './auth.routes.js';
import conversationRoutes from './conversation.routes.js';
import messageRoutes from './message.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/conversations', authenticate, conversationRoutes);
router.use('/messages', authenticate, messageRoutes);

export default router;
